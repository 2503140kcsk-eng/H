import { registerSW } from "virtual:pwa-register";
import { Game, type GameMode, type HudState, type RunResult } from "./game/Game";
import { createDefaultSave, upgradeCost, type SaveData } from "./game/core";
import { exportBackup, importBackup } from "./persistence/backup";
import { getSavePersistenceStatus, loadSave, saveProgress } from "./persistence/database";
import { ALL_PILOT_IDS, PILOT_PROFILES, getPilotProfile, isPilotId } from "./game/pilots";
import { ALL_SHIP_IDS, SHIP_PROFILES, isShipId } from "./game/ships";
import { ACHIEVEMENTS, evaluateAchievements } from "./game/achievements";
import { ALL_PLANET_IDS, PLANETS, getPlanetProfile, isPlanetUnlocked, type PlanetId } from "./game/campaign";
import { SoundDirector } from "./game/audio";
import { ALL_WEAPON_IDS, WEAPON_PROFILES, isWeaponId } from "./game/weapons";
import "./style.css";

registerSW({ immediate: true });

const uiRoot = document.querySelector<HTMLDivElement>("#ui-root");
const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!uiRoot || !canvas) throw new Error("Game shell is incomplete.");
const gameCanvas: HTMLCanvasElement = canvas;

uiRoot.innerHTML = `
  <div class="rotate-note" role="status">
    <span class="rotate-icon">↻</span>
    <strong>横向きで遊ぼう！</strong>
    <span>iPhoneを横向きにしてね</span>
  </div>

  <section id="menu-screen" class="screen title-screen">
    <div class="title-card">
      <div class="brand-mark">✦</div>
      <p class="eyebrow">A LITTLE STAR, A BIG UNIVERSE</p>
      <h1>STARLIGHT <span>WING</span></h1>
      <p class="subtitle">星の翼 — かわいさ × 本格SFシューティング</p>
      <div class="pilot-card">
        <div id="pilot-avatar" class="pilot-avatar" aria-hidden="true">✦</div>
        <div><strong id="pilot-name">ルミ・アステリア</strong><small id="pilot-role">オールラウンダー / Lv.1</small></div>
        <span class="pilot-status">READY</span>
      </div>
      <div class="mode-grid">
        <button class="mode-button primary" data-mode="story"><span>STORY</span><small>星域の謎を追う</small></button>
        <button class="mode-button" data-mode="stage"><span>STAGE</span><small>ボスを撃破せよ</small></button>
        <button class="mode-button" data-mode="endless"><span>ENDLESS</span><small>限界まで生き残れ</small></button>
      </div>
      <div class="hangar">
        <div class="hangar-top"><span>✧ HANGAR UPGRADES</span><span id="currency" class="currency">0 ✦</span></div>
        <div class="upgrade-row">
          <div><strong>フォトン出力</strong><small>攻撃力・マルチショット</small><span id="attack-level" class="level">Lv. 0</span></div>
          <button id="upgrade-attack" class="upgrade-button">強化 <b id="attack-cost">100</b> ✦</button>
        </div>
        <div class="upgrade-row">
          <div><strong>ナノ装甲</strong><small>最大HP +1 / レベル</small><span id="hull-level" class="level">Lv. 0</span></div>
          <button id="upgrade-hull" class="upgrade-button">強化 <b id="hull-cost">90</b> ✦</button>
        </div>
        <div class="ship-dock">
          <div class="ship-dock-heading"><strong>機体セレクト</strong><span>解放した機体は永久使用OK</span></div>
          <div id="ship-list" class="ship-options" aria-label="宇宙船選択"></div>
          <div class="pilot-dock">
            <div class="pilot-dock-heading"><strong>パイロット選択</strong><span>固有スキル・個別エピソード・専用モーション</span></div>
            <div id="pilot-list" class="pilot-options" aria-label="パイロット選択"></div>
          </div>
        </div>
        <div class="expansion-dock">
          <section class="campaign-dock">
            <div class="expansion-heading"><strong>惑星キャンペーン</strong><span>星域を順番に解放</span></div>
            <div id="planet-list" class="planet-options" aria-label="惑星選択"></div>
            <p id="mission-briefing" class="mission-briefing"></p>
          </section>
          <section class="weapon-dock">
            <div class="expansion-heading"><strong>武器ラボ · 2 SLOTS</strong><span>スロットを選んで装備</span></div>
            <div id="weapon-slot-list" class="weapon-slot-list">
              <button id="weapon-slot-0" data-weapon-slot="0" type="button" class="slot-button selected">SLOT 1 · PULSE</button>
              <button id="weapon-slot-1" data-weapon-slot="1" type="button" class="slot-button">SLOT 2 · PULSE</button>
            </div>
            <div id="weapon-list" class="weapon-options" aria-label="武器一覧"></div>
          </section>
          <section class="collection-dock">
            <div class="expansion-heading"><strong>航海記録</strong><span>実績 · ボス図鑑 · ローカルランキング</span></div>
            <div id="achievement-list" class="achievement-list"></div>
            <div id="boss-collection" class="boss-collection"></div>
            <ol id="local-ranking" class="local-ranking"></ol>
          </section>
        </div>
      </div>
      <div class="menu-footer">
        <button id="settings-toggle" class="text-button">⚙ 設定</button>
        <button id="export-save" class="text-button">↓ セーブ書き出し</button>
        <button id="import-save" class="text-button">↑ 読み込み</button>
        <input id="save-file" type="file" accept=".json,application/json" hidden />
      </div>
      <div id="settings-panel" class="settings-panel" hidden>
        <label>操作感度 <input id="sensitivity" type="range" min="0.35" max="2.5" step="0.05" value="1" /></label>
        <label>効果音 <input id="volume" type="range" min="0" max="1" step="0.05" value="0.65" /></label>
        <p>セーブはこの端末内に保存。機種変更はJSONバックアップで引き継げます。</p>
      </div>
      <p id="save-status" class="save-status" role="status" aria-live="polite">端末内保存：確認中…</p>
      <p class="fine-print">NO ADS · NO GACHA · NO PAY-TO-WIN</p>
    </div>
  </section>

  <section id="game-hud" class="game-hud" hidden>
    <header class="hud-top">
      <div class="hud-brand"><span>✦</span> STARLIGHT WING <small id="mode-label">STORY</small></div>
      <div class="hud-stat"><small>SCORE</small><strong id="stat-score">000000</strong></div>
      <div class="hud-stat"><small>TIME</small><strong id="stat-time">00:00</strong></div>
      <div class="hud-stat"><small>DOWN</small><strong id="stat-kills">0</strong></div>
      <button id="pause-button" class="icon-button" aria-label="一時停止">Ⅱ</button>
    </header>
    <div class="hud-left">
      <div class="pilot-mini"><span id="pilot-hud-avatar">✦</span><div><strong id="pilot-label">LUMI</strong><small id="ship-label">LUMEN-01</small></div></div>
      <div class="meter-label"><span>HULL</span><b id="hp-text">3 / 3</b></div>
      <div class="meter"><i id="hp-fill" class="hp-fill"></i></div>
      <div class="meter-label"><span>SHIELD</span><b id="shield-text">100%</b></div>
      <div class="meter"><i id="shield-fill" class="shield-fill"></i></div>
      <div id="combo-label" class="combo-label" hidden>COMBO ×<b id="combo-value">0</b></div>
    </div>
    <div id="boss-panel" class="boss-panel" hidden>
      <div class="boss-name"><span>⚠</span> <b id="boss-name">BOSS</b> <small>PHASE <b id="boss-phase">I</b></small></div>
      <div class="boss-meter"><i id="boss-fill"></i></div>
      <small id="boss-weakpoint" class="boss-weakpoint" hidden>WEAKPOINT OPEN · DAMAGE × UP</small>
    </div>
    <aside id="comms-panel" class="comms-panel" role="status" aria-live="polite" hidden>
      <span id="comms-speaker" class="comms-speaker">MISSION CONTROL</span>
      <p id="comms-message" class="comms-message"></p>
    </aside>
    <div class="hud-bottom">
      <div class="special-meter"><div><span>PHOTON BURST</span><b id="special-text">60%</b></div><div class="meter"><i id="special-fill" class="special-fill"></i></div></div>
      <div class="touch-hint">画面をドラッグして移動 · 射撃はオート</div>
    </div>
    <div class="action-controls">
      <button id="special-button" class="action-button special-action"><span>✦</span><b>BURST</b><small>60%</small></button>
      <button id="shield-button" class="action-button shield-action"><span>◈</span><b>SHIELD</b><small>30%</small></button>
      <button id="weapon-switch-button" class="action-button weapon-action"><span>⇄</span><b id="weapon-name">PULSE</b><small id="weapon-slot-label">SLOT 1</small></button>
    </div>
  </section>

  <section id="pause-modal" class="modal" hidden>
    <div class="modal-card compact">
      <p class="eyebrow">PAUSED · SAFE FLIGHT</p>
      <h2>ひと休みしよっ♪</h2>
      <p>戦闘は停止中だよ。準備ができたら戻ろう！</p>
      <button id="resume-button" class="large-button">戦闘に戻る</button>
      <button id="pause-menu-button" class="sub-button">ハンガーへ戻る</button>
    </div>
  </section>

  <section id="result-modal" class="modal" hidden>
    <div class="modal-card compact">
      <p id="result-kicker" class="eyebrow">MISSION RESULT</p>
      <h2 id="result-title">MISSION CLEAR!</h2>
      <div class="result-score"><small>TOTAL SCORE</small><strong id="result-score">0</strong></div>
      <div class="result-stats">
        <div><small>撃破数</small><b id="result-kills">0</b></div>
        <div><small>獲得シャード</small><b id="result-shards">0 ✦</b></div>
        <div><small>飛行時間</small><b id="result-time">00:00</b></div>
      </div>
      <p id="result-unlocks" class="result-unlocks"></p>
      <button id="retry-button" class="large-button">もう一度出撃！</button>
      <button id="result-menu-button" class="sub-button">ハンガーへ戻る</button>
    </div>
  </section>

  <div id="toast" class="toast" role="status" aria-live="polite"></div>
`;

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error("Missing UI element: " + id);
  return element as T;
}

const menuScreen = byId<HTMLElement>("menu-screen");
const gameHud = byId<HTMLElement>("game-hud");
const pauseModal = byId<HTMLElement>("pause-modal");
const resultModal = byId<HTMLElement>("result-modal");
const settingsPanel = byId<HTMLElement>("settings-panel");
const toast = byId<HTMLDivElement>("toast");
const commsPanel = byId<HTMLElement>("comms-panel");
const commsSpeaker = byId<HTMLElement>("comms-speaker");
const commsMessage = byId<HTMLElement>("comms-message");
const sensitivityInput = byId<HTMLInputElement>("sensitivity");
const volumeInput = byId<HTMLInputElement>("volume");
const saveFileInput = byId<HTMLInputElement>("save-file");

let save: SaveData = createDefaultSave();
let game: Game | null = null;
let currentMode: GameMode = "story";
let runActive = false;
let paused = false;
const sound = new SoundDirector();
let toastTimeout = 0;
let commsTimeout = 0;
const commsQueue: Array<{ speaker: string; message: string }> = [];

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function displayNextComms(): void {
  const line = commsQueue.shift();
  if (!line) {
    commsTimeout = 0;
    commsPanel.hidden = true;
    return;
  }
  commsSpeaker.textContent = line.speaker;
  commsMessage.textContent = line.message;
  commsPanel.hidden = false;
  commsTimeout = window.setTimeout(displayNextComms, 3_600);
}

function showComms(speaker: string, message: string): void {
  commsQueue.push({ speaker, message });
  if (commsTimeout === 0) displayNextComms();
}

function clearComms(): void {
  window.clearTimeout(commsTimeout);
  commsTimeout = 0;
  commsQueue.length = 0;
  commsPanel.hidden = true;
}

function playTone(frequency: number, duration = 0.075): void {
  sound.setVolume(save.settings.volume);
  sound.tone(frequency, duration);
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
}

function showMenu(): void {
  clearComms();
  runActive = false;
  paused = false;
  game?.dispose();
  game = null;
  menuScreen.hidden = false;
  gameHud.hidden = true;
  pauseModal.hidden = true;
  resultModal.hidden = true;
  refreshMenu();
}

function renderShipChoices(): void {
  const list = byId<HTMLDivElement>("ship-list");
  list.innerHTML = ALL_SHIP_IDS.map((id) => {
    const ship = SHIP_PROFILES[id];
    const unlocked = save.unlockedShips.includes(id);
    const selected = save.selectedShip === id;
    const disabled = !unlocked && save.shards < ship.unlockCost;
    const action = unlocked ? (selected ? "装備中" : "選択") : `解放 ${ship.unlockCost.toLocaleString("ja-JP")} ✦`;
    return `<button type="button" class="ship-option ${selected ? "selected" : ""} ${unlocked ? "unlocked" : "locked"}"
      data-ship-id="${ship.id}" ${disabled ? "disabled" : ""} aria-pressed="${selected}">
      <span class="ship-option-name">${ship.name}</span>
      <span class="ship-option-class">${ship.className}</span>
      <span class="ship-option-description">${ship.description}</span>
      <b class="ship-option-action">${action}</b>
    </button>`;
  }).join("");
}

function renderPilotChoices(): void {
  const list = byId<HTMLDivElement>("pilot-list");
  list.innerHTML = ALL_PILOT_IDS.map((id) => {
    const pilot = PILOT_PROFILES[id];
    const unlocked = save.unlockedPilots.includes(id);
    const selected = save.selectedPilot === id;
    const progress = save.pilotProgress[id] ?? { level: 1, xp: 0 };
    const disabled = !unlocked && save.shards < pilot.unlockCost;
    const action = unlocked ? (selected ? "選択中" : "選択") : `解放 ${pilot.unlockCost.toLocaleString("ja-JP")} ✦`;
    return `<button type="button" class="pilot-option ${selected ? "selected" : ""} ${unlocked ? "unlocked" : "locked"}"
      data-pilot-id="${pilot.id}" ${disabled ? "disabled" : ""} aria-pressed="${selected}" title="${pilot.biography} · ${pilot.skillDescription} · ${pilot.storyIntro}">
      <span class="pilot-option-avatar animation-${pilot.animationStyle}" style="--pilot-accent:#${pilot.accentColor.toString(16).padStart(6, "0")}">${pilot.avatar}</span>
      <span class="pilot-option-copy"><b>${pilot.name}</b><small>${pilot.className} · Lv.${progress.level}</small><small>${pilot.skillName}</small></span>
      <span class="pilot-option-action">${action}</span>
    </button>`;
  }).join("");
}

function renderPlanetChoices(): void {
  const list = byId<HTMLDivElement>("planet-list");
  list.innerHTML = ALL_PLANET_IDS.map((id) => {
    const planet = PLANETS[id];
    const unlocked = isPlanetUnlocked(id, save.completedPlanets as PlanetId[]);
    const selected = save.selectedPlanet === id;
    const status = selected ? "航路選択中" : unlocked ? "航行可能" : "未解放";
    return `<button type="button" class="planet-option ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}"
      data-planet-id="${id}" ${unlocked ? "" : "disabled"} aria-pressed="${selected}">
      <b>${planet.name}</b><small>${planet.sector}</small><span>${status}</span>
    </button>`;
  }).join("");
  const planet = getPlanetProfile(save.selectedPlanet);
  const pilot = getPilotProfile(save.selectedPilot);
  const personalLine = planet.pilotBriefings[save.selectedPilot] ?? pilot.storyIntro;
  byId("mission-briefing").textContent = `${planet.description}\nMISSION · ${planet.missionLog}\n${personalLine}\nBOSS · ${planet.boss.name} — 弱点倍率 ×${planet.boss.weakpointMultiplier}`;
}

function renderWeaponChoices(): void {
  const list = byId<HTMLDivElement>("weapon-list");
  list.innerHTML = ALL_WEAPON_IDS.map((id) => {
    const weapon = WEAPON_PROFILES[id];
    const unlocked = save.unlockedWeapons.includes(id);
    const selected = save.equippedWeapons[save.activeWeaponSlot] === id;
    const disabled = !unlocked && save.shards < weapon.unlockCost;
    const action = unlocked ? (selected ? "装備中" : `SLOT ${save.activeWeaponSlot + 1} に装備`)
      : `解放 ${weapon.unlockCost.toLocaleString("ja-JP")} ✦`;
    return `<button type="button" class="weapon-option ${selected ? "selected" : ""} ${unlocked ? "" : "locked"}"
      data-weapon-id="${id}" ${disabled ? "disabled" : ""} aria-pressed="${selected}">
      <b>${weapon.name}</b><small>${weapon.shortName} · ${weapon.description}</small><span>${action}</span>
    </button>`;
  }).join("");
  for (let slot = 0; slot < 2; slot += 1) {
    const weapon = WEAPON_PROFILES[save.equippedWeapons[slot] as keyof typeof WEAPON_PROFILES] ?? WEAPON_PROFILES["photon-pulse"];
    const button = byId<HTMLButtonElement>(`weapon-slot-${slot}`);
    button.textContent = `SLOT ${slot + 1} · ${weapon.shortName}`;
    button.classList.toggle("selected", save.activeWeaponSlot === slot);
    button.setAttribute("aria-pressed", String(save.activeWeaponSlot === slot));
  }
}

function renderCollection(): void {
  const achievements = byId<HTMLDivElement>("achievement-list");
  achievements.innerHTML = ACHIEVEMENTS.map((entry) => {
    const unlocked = save.achievements.includes(entry.id);
    return `<span class="achievement-chip ${unlocked ? "unlocked" : ""}" title="${entry.description}">${unlocked ? "✓" : "◇"} ${entry.name}</span>`;
  }).join("");
  const bosses = ALL_PLANET_IDS.map((id) => PLANETS[id].boss).map((boss) =>
    `<span class="boss-chip ${save.bossCollection.includes(boss.id) ? "collected" : ""}">${save.bossCollection.includes(boss.id) ? boss.name : "？？？"}</span>`
  );
  byId<HTMLDivElement>("boss-collection").innerHTML = `<small>ボス図鑑 · ${save.bossCollection.length}/${ALL_PLANET_IDS.length}</small><div>${bosses.join("")}</div>`;
  byId<HTMLOListElement>("local-ranking").innerHTML = save.highScores.slice(0, 10).map((entry, index) => {
    const planet = PLANETS[entry.planetId as PlanetId];
    return `<li><b>${index + 1}.</b> ${entry.score.toLocaleString("ja-JP")} <small>${entry.mode.toUpperCase()} · ${planet?.name ?? "UNKNOWN"} · ${entry.pilotId}</small></li>`;
  }).join("") || "<li>まだ記録がありません。最初の出撃を飾ろう！</li>";
}

function refreshMenu(): void {
  const selectedPilot = getPilotProfile(save.selectedPilot);
  const selectedProgress = save.pilotProgress[save.selectedPilot] ?? { level: save.pilotLevel, xp: save.pilotXp };
  byId("pilot-name").textContent = selectedPilot.name;
  byId("pilot-role").textContent = selectedPilot.className + " · Lv." + selectedProgress.level;
  byId("pilot-avatar").textContent = selectedPilot.avatar;
  byId("currency").textContent = save.shards.toLocaleString("en-US") + " ✦";
  byId("attack-level").textContent = "Lv. " + save.upgrades.attack;
  byId("hull-level").textContent = "Lv. " + save.upgrades.hull;
  const attackCost = save.upgrades.attack >= 20 ? null : upgradeCost(100, save.upgrades.attack);
  const hullCost = save.upgrades.hull >= 20 ? null : upgradeCost(90, save.upgrades.hull);
  byId("attack-cost").textContent = attackCost === null ? "MAX" : attackCost.toLocaleString("en-US");
  byId("hull-cost").textContent = hullCost === null ? "MAX" : hullCost.toLocaleString("en-US");
  const attackButton = byId<HTMLButtonElement>("upgrade-attack");
  const hullButton = byId<HTMLButtonElement>("upgrade-hull");
  attackButton.disabled = attackCost === null || save.shards < attackCost;
  hullButton.disabled = hullCost === null || save.shards < hullCost;
  renderShipChoices();
  renderPilotChoices();
  renderPlanetChoices();
  renderWeaponChoices();
  renderCollection();
  sensitivityInput.value = String(save.settings.sensitivity);
  volumeInput.value = String(save.settings.volume);
  const status = byId<HTMLParagraphElement>("save-status");
  const persistenceMode = getSavePersistenceStatus();
  status.dataset.mode = persistenceMode;
  status.textContent = persistenceMode === "memory-only"
    ? "メモリ保存のみ：再起動すると進行が失われる可能性があります。JSONバックアップを保存してください。"
    : persistenceMode === "persistent"
      ? "端末内保存：有効"
      : "端末内保存：確認中…";
}

async function persist(): Promise<void> {
  save = await saveProgress(save);
  refreshMenu();
}

function makeGame(): Game {
  return new Game({
    canvas: gameCanvas,
    sensitivity: save.settings.sensitivity,
    upgrades: save.upgrades,
    shipId: save.selectedShip,
    pilotId: save.selectedPilot,
    pilotLevel: save.pilotProgress[save.selectedPilot]?.level ?? save.pilotLevel,
    planetId: save.selectedPlanet,
    weaponIds: save.equippedWeapons,
    activeWeaponSlot: save.activeWeaponSlot,
    invulnerableForTest: import.meta.env.DEV && new URLSearchParams(window.location.search).get("test") === "mission-events",
    onMissionEvent: (message, speaker = "MISSION CONTROL") => {
      showToast(message);
      showComms(speaker, message);
      if (message.includes("弱点コア開放")) sound.cue("weakpoint");
      else if (message.includes("撃破")) sound.cue("victory");
      else if (message.includes("達成")) sound.cue("unlock");
    },
    onHudUpdate: updateHud,
    onRunEnd: (result) => { void handleRunEnd(result); },
    onGraphicsContextLost: () => {
      pauseGame();
      showToast("3D描画が一時停止しました。復旧したら「戦闘に戻る」を押してね。");
    },
    onGraphicsContextRestored: () => {
      showToast("3D描画が復旧しました。再開ボタンを押してね。");
    }
  });
}

function startRun(mode: GameMode): void {
  try {
    clearComms();
    game?.dispose();
    game = makeGame();
    currentMode = mode;
    game.start(mode);
    sound.setVolume(save.settings.volume);
    sound.startMusic();
    sound.cue("launch");
    menuScreen.hidden = true;
    pauseModal.hidden = true;
    resultModal.hidden = true;
    gameHud.hidden = false;
    runActive = true;
    paused = false;
    byId("mode-label").textContent = mode.toUpperCase();
    byId("pilot-label").textContent = getPilotProfile(save.selectedPilot).callSign;
    byId("pilot-hud-avatar").textContent = getPilotProfile(save.selectedPilot).avatar;
    byId("ship-label").textContent = save.selectedShip;
    playTone(660, 0.16);
  } catch (error) {
    game?.dispose();
    game = null;
    const detail = error instanceof Error ? error.message : String(error);
    showToast("3D描画を開始できませんでした。WebGL対応ブラウザで開いてね。");
    console.error("Unable to initialize WebGL game:", detail);
  }
}

function updateHud(state: HudState): void {
  byId("stat-score").textContent = Math.floor(state.score).toLocaleString("en-US").padStart(6, "0");
  byId("stat-time").textContent = formatTime(state.elapsed);
  byId("stat-kills").textContent = String(state.kills);
  byId("hp-text").textContent = state.hp + " / " + state.maxHp;
  byId("shield-text").textContent = Math.round(state.shield) + "%";
  byId("special-text").textContent = Math.round(state.special) + "%";
  byId("hp-fill").setAttribute("style", "width:" + (state.maxHp > 0 ? state.hp / state.maxHp * 100 : 0) + "%");
  byId("shield-fill").setAttribute("style", "width:" + state.shield + "%");
  byId("special-fill").setAttribute("style", "width:" + state.special + "%");
  const bossPanel = byId<HTMLElement>("boss-panel");
  bossPanel.hidden = state.bossMaxHp <= 0;
  if (state.bossMaxHp > 0) {
    byId("boss-fill").setAttribute("style", "width:" + Math.max(0, state.bossHp / state.bossMaxHp * 100) + "%");
    byId("boss-phase").textContent = state.bossHp <= state.bossMaxHp * 0.5 ? "II" : "I";
  }
  const combo = byId<HTMLElement>("combo-label");
  combo.hidden = state.combo < 2;
  byId("combo-value").textContent = String(state.combo);
  byId<HTMLButtonElement>("special-button").disabled = state.special < 60;
  byId<HTMLButtonElement>("shield-button").disabled = state.shield < 30;
  byId("boss-name").textContent = state.bossName || "BOSS";
  byId<HTMLElement>("boss-weakpoint").hidden = !state.bossWeakpointOpen;
  byId("weapon-name").textContent = state.weaponName;
  byId("weapon-slot-label").textContent = "SLOT " + (state.weaponSlot + 1);
  sound.setBossMode(state.bossMaxHp > 0);
}

async function handleRunEnd(result: RunResult): Promise<void> {
  if (!runActive) return;
  runActive = false;
  paused = false;
  gameHud.hidden = true;
  pauseModal.hidden = true;
  sound.stopMusic();
  sound.cue(result.status === "clear" ? "victory" : "defeat");
  const reward = result.shards + (result.status === "clear" ? 20 : Math.floor(result.duration / 45));
  const next = structuredClone(save);
  next.shards = Math.min(100_000_000, next.shards + reward);
  next.totalRuns += 1;
  next.bestScores[result.mode] = Math.max(next.bestScores[result.mode] ?? 0, result.score);
  if (result.status === "clear" && result.mode === "story" && !next.completedPlanets.includes(result.planetId)) {
    next.completedPlanets.push(result.planetId);
  }
  for (const bossId of result.bossesDefeated) {
    if (!next.bossCollection.includes(bossId)) next.bossCollection.push(bossId);
  }
  next.highScores.push({ score: Math.floor(result.score), mode: result.mode, pilotId: next.selectedPilot, planetId: result.planetId, achievedAt: Date.now() });
  next.highScores.sort((left, right) => right.score - left.score || right.achievedAt - left.achievedAt);
  next.highScores = next.highScores.slice(0, 10);
  const activePilotId = next.selectedPilot;
  const activeProgress = next.pilotProgress[activePilotId] ?? { level: next.pilotLevel, xp: next.pilotXp };
  activeProgress.xp += result.kills * 12 + (result.status === "clear" ? 100 : 0);
  while (activeProgress.level < 100 && activeProgress.xp >= activeProgress.level * 100) {
    activeProgress.xp -= activeProgress.level * 100;
    activeProgress.level += 1;
  }
  next.pilotProgress[activePilotId] = activeProgress;
  next.pilotLevel = activeProgress.level;
  next.pilotXp = activeProgress.xp;
  const newlyUnlocked = evaluateAchievements({
    totalRuns: next.totalRuns, kills: result.kills, score: result.score,
    bossesDefeated: result.bossesDefeated, completedPlanets: next.completedPlanets,
    unlockedWeapons: next.unlockedWeapons as (typeof ALL_WEAPON_IDS)[number][]
  }, next.achievements);
  next.achievements = [...next.achievements, ...newlyUnlocked];
  save = await saveProgress(next);
  refreshMenu();
  byId("result-kicker").textContent = result.mode.toUpperCase() + " · " + formatTime(result.duration);
  byId("result-title").textContent = result.status === "clear" ? "MISSION CLEAR!" : "FLIGHT OVER";
  byId("result-score").textContent = Math.floor(result.score).toLocaleString("en-US");
  byId("result-kills").textContent = String(result.kills);
  byId("result-shards").textContent = "+" + reward + " ✦";
  byId("result-time").textContent = formatTime(result.duration);
  byId("result-unlocks").textContent = newlyUnlocked.length
    ? "NEW ACHIEVEMENTS · " + newlyUnlocked.map((id) => ACHIEVEMENTS.find((entry) => entry.id === id)?.name ?? id).join(" / ")
    : result.status === "clear" ? "惑星データとボス図鑑を更新しました。" : "次の航海に備えて機体を整えよう。";
  resultModal.hidden = false;
  playTone(result.status === "clear" ? 880 : 260, 0.24);
}

async function buyUpgrade(kind: "attack" | "hull"): Promise<void> {
  const level = save.upgrades[kind];
  if (level >= 20) return;
  const cost = upgradeCost(kind === "attack" ? 100 : 90, level);
  if (save.shards < cost) {
    showToast("シャードが足りないよ！");
    return;
  }
  save.shards -= cost;
  save.upgrades[kind] += 1;
  await persist();
  playTone(kind === "attack" ? 760 : 540, 0.1);
  showToast(kind === "attack" ? "フォトン出力を強化したよ！" : "ナノ装甲を強化したよ！");
}

function pauseGame(): void {
  if (!game || !runActive || paused) return;
  game.pause();
  paused = true;
  pauseModal.hidden = false;
  sound.stopMusic();
  sound.cue("pause");
  playTone(390);
}

function resumeGame(): void {
  if (!game || !runActive || !paused) return;
  paused = false;
  pauseModal.hidden = true;
  game.resume();
  sound.startMusic();
  sound.cue("resume");
  playTone(520);
}

async function initialize(): Promise<void> {
  try {
    save = await loadSave();
  } catch {
    save = createDefaultSave();
  }
  sound.setVolume(save.settings.volume);
  refreshMenu();
  showMenu();
}

document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => startRun(button.dataset.mode as GameMode));
});
byId("upgrade-attack").addEventListener("click", () => { void buyUpgrade("attack"); });
byId("upgrade-hull").addEventListener("click", () => { void buyUpgrade("hull"); });
byId("pilot-list").addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>("[data-pilot-id]");
  const pilotId = button?.dataset.pilotId;
  if (!pilotId || !isPilotId(pilotId)) return;
  const pilot = PILOT_PROFILES[pilotId];

  if (save.unlockedPilots.includes(pilotId)) {
    if (save.selectedPilot === pilotId) return;
    save.selectedPilot = pilotId;
    const progress = save.pilotProgress[pilotId] ?? { level: 1, xp: 0 };
    save.pilotProgress[pilotId] = progress;
    save.pilotLevel = progress.level;
    save.pilotXp = progress.xp;
    await persist();
    showToast(pilot.name + "を選択したよ！");
    playTone(760, 0.12);
    return;
  }

  if (save.shards < pilot.unlockCost) {
    showToast("シャードが足りないよ！");
    return;
  }
  save.shards -= pilot.unlockCost;
  save.unlockedPilots.push(pilotId);
  save.selectedPilot = pilotId;
  const progress = save.pilotProgress[pilotId] ?? { level: 1, xp: 0 };
  save.pilotProgress[pilotId] = progress;
  save.pilotLevel = progress.level;
  save.pilotXp = progress.xp;
  await persist();
  showToast(pilot.name + "が仲間になったよ！");
  playTone(980, 0.16);
});
byId("planet-list").addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const id = event.target.closest<HTMLButtonElement>("[data-planet-id]")?.dataset.planetId;
  if (!id || !isPlanetUnlocked(id, save.completedPlanets as PlanetId[])) return;
  save.selectedPlanet = id;
  await persist();
  showToast(getPlanetProfile(id).name + "への航路を設定したよ！");
});
byId("weapon-slot-list").addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const slot = event.target.closest<HTMLButtonElement>("[data-weapon-slot]")?.dataset.weaponSlot;
  if (slot !== "0" && slot !== "1") return;
  save.activeWeaponSlot = Number(slot) as 0 | 1;
  await persist();
});
byId("weapon-list").addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const id = event.target.closest<HTMLButtonElement>("[data-weapon-id]")?.dataset.weaponId;
  if (!id || !isWeaponId(id)) return;
  const weapon = WEAPON_PROFILES[id];
  if (!save.unlockedWeapons.includes(id)) {
    if (save.shards < weapon.unlockCost) { showToast("シャードが足りないよ！"); return; }
    save.shards -= weapon.unlockCost;
    save.unlockedWeapons.push(id);
    save.equippedWeapons[save.activeWeaponSlot] = id;
    await persist();
    showToast(weapon.name + "を解放したよ！");
    sound.cue("unlock");
    return;
  }
  save.equippedWeapons[save.activeWeaponSlot] = id;
  await persist();
  showToast("SLOT " + (save.activeWeaponSlot + 1) + " に " + weapon.name + " を装備！");
  playTone(780, 0.12);
});
byId("ship-list").addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>("[data-ship-id]");
  const shipId = button?.dataset.shipId;
  if (!shipId || !isShipId(shipId)) return;
  const ship = SHIP_PROFILES[shipId];

  if (save.unlockedShips.includes(shipId)) {
    if (save.selectedShip === shipId) return;
    save.selectedShip = shipId;
    await persist();
    showToast(ship.name + "を装備したよ！");
    playTone(720, 0.11);
    return;
  }

  if (save.shards < ship.unlockCost) {
    showToast("シャードが足りないよ！");
    return;
  }
  save.shards -= ship.unlockCost;
  save.unlockedShips.push(shipId);
  save.selectedShip = shipId;
  await persist();
  showToast(ship.name + "を解放して装備したよ！");
  playTone(920, 0.16);
});
byId("pause-button").addEventListener("click", pauseGame);
byId("resume-button").addEventListener("click", resumeGame);
byId("pause-menu-button").addEventListener("click", showMenu);
byId("result-menu-button").addEventListener("click", showMenu);
byId("retry-button").addEventListener("click", () => startRun(currentMode));
byId("special-button").addEventListener("click", () => {
  game?.specialAttack();
  sound.cue("special");
  playTone(1040, 0.12);
});
byId("weapon-switch-button").addEventListener("click", () => {
  game?.switchWeaponSlot();
  playTone(880, 0.08);
});
byId("shield-button").addEventListener("click", () => {
  game?.activateShield();
  sound.cue("shield");
  playTone(520, 0.1);
});
byId("settings-toggle").addEventListener("click", () => {
  settingsPanel.hidden = !settingsPanel.hidden;
});
byId("export-save").addEventListener("click", () => {
  exportBackup(save);
  playTone(620);
  showToast("バックアップを書き出したよ。ファイルアプリで保存してね。");
});
byId("import-save").addEventListener("click", () => saveFileInput.click());
saveFileInput.addEventListener("change", async () => {
  const file = saveFileInput.files?.[0];
  if (!file) return;
  if (!window.confirm("現在のセーブを端末内の復元用スナップショットに保存してから、このバックアップを読み込みます。続けますか？")) {
    saveFileInput.value = "";
    return;
  }
  try {
    game?.dispose();
    game = null;
    save = await importBackup(file);
    refreshMenu();
    showToast("バックアップを復元しました！");
    playTone(760);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "復元に失敗しました。");
  } finally {
    saveFileInput.value = "";
  }
});
sensitivityInput.addEventListener("input", () => {
  save.settings.sensitivity = Number(sensitivityInput.value);
  game?.setSensitivity(save.settings.sensitivity);
  void persist();
});
volumeInput.addEventListener("input", () => {
  save.settings.volume = Number(volumeInput.value);
  sound.setVolume(save.settings.volume);
  void persist();
  playTone(460);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && runActive && !paused) pauseGame();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && runActive && !paused) pauseGame();
});
window.addEventListener("beforeunload", () => {
  game?.dispose();
  sound.dispose();
});

void initialize();

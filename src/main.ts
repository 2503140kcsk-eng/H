import { registerSW } from "virtual:pwa-register";
import { Game, type GameMode, type HudState, type RunResult } from "./game/Game";
import { createDefaultSave, upgradeCost, type SaveData } from "./game/core";
import { exportBackup, importBackup } from "./persistence/backup";
import { getSavePersistenceStatus, loadSave, saveProgress } from "./persistence/database";
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
        <div class="pilot-avatar" aria-hidden="true">✧</div>
        <div><strong>ルミ・アステリア</strong><small>パイロット / Lumen-01</small></div>
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
      <div class="pilot-mini"><span>✧</span><div><strong>LUMI</strong><small>LUMEN-01</small></div></div>
      <div class="meter-label"><span>HULL</span><b id="hp-text">3 / 3</b></div>
      <div class="meter"><i id="hp-fill" class="hp-fill"></i></div>
      <div class="meter-label"><span>SHIELD</span><b id="shield-text">100%</b></div>
      <div class="meter"><i id="shield-fill" class="shield-fill"></i></div>
      <div id="combo-label" class="combo-label" hidden>COMBO ×<b id="combo-value">0</b></div>
    </div>
    <div id="boss-panel" class="boss-panel" hidden>
      <div class="boss-name"><span>⚠</span> NEBULA EMPRESS <small>PHASE <b id="boss-phase">I</b></small></div>
      <div class="boss-meter"><i id="boss-fill"></i></div>
    </div>
    <div class="hud-bottom">
      <div class="special-meter"><div><span>PHOTON BURST</span><b id="special-text">60%</b></div><div class="meter"><i id="special-fill" class="special-fill"></i></div></div>
      <div class="touch-hint">画面をドラッグして移動 · 射撃はオート</div>
    </div>
    <div class="action-controls">
      <button id="special-button" class="action-button special-action"><span>✦</span><b>BURST</b><small>60%</small></button>
      <button id="shield-button" class="action-button shield-action"><span>◈</span><b>SHIELD</b><small>30%</small></button>
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
const sensitivityInput = byId<HTMLInputElement>("sensitivity");
const volumeInput = byId<HTMLInputElement>("volume");
const saveFileInput = byId<HTMLInputElement>("save-file");

let save: SaveData = createDefaultSave();
let game: Game | null = null;
let currentMode: GameMode = "story";
let runActive = false;
let paused = false;
let audioContext: AudioContext | null = null;
let toastTimeout = 0;

function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function playTone(frequency: number, duration = 0.075): void {
  if (save.settings.volume <= 0 || !("AudioContext" in window)) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime;
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, save.settings.volume * 0.075), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  } catch {
    // Audio is optional; a denied audio context must not affect gameplay.
  }
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return String(Math.floor(whole / 60)).padStart(2, "0") + ":" + String(whole % 60).padStart(2, "0");
}

function showMenu(): void {
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

function refreshMenu(): void {
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
    game?.dispose();
    game = makeGame();
    currentMode = mode;
    game.start(mode);
    menuScreen.hidden = true;
    pauseModal.hidden = true;
    resultModal.hidden = true;
    gameHud.hidden = false;
    runActive = true;
    paused = false;
    byId("mode-label").textContent = mode.toUpperCase();
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
}

async function handleRunEnd(result: RunResult): Promise<void> {
  if (!runActive) return;
  runActive = false;
  paused = false;
  gameHud.hidden = true;
  pauseModal.hidden = true;
  const reward = result.shards + (result.status === "clear" ? 20 : Math.floor(result.duration / 45));
  const next = structuredClone(save);
  next.shards = Math.min(100_000_000, next.shards + reward);
  next.totalRuns += 1;
  next.bestScores[result.mode] = Math.max(next.bestScores[result.mode] ?? 0, result.score);
  next.pilotXp += result.kills * 12 + (result.status === "clear" ? 100 : 0);
  while (next.pilotLevel < 100 && next.pilotXp >= next.pilotLevel * 100) {
    next.pilotXp -= next.pilotLevel * 100;
    next.pilotLevel += 1;
  }
  save = await saveProgress(next);
  refreshMenu();
  byId("result-kicker").textContent = result.mode.toUpperCase() + " · " + formatTime(result.duration);
  byId("result-title").textContent = result.status === "clear" ? "MISSION CLEAR!" : "FLIGHT OVER";
  byId("result-score").textContent = Math.floor(result.score).toLocaleString("en-US");
  byId("result-kills").textContent = String(result.kills);
  byId("result-shards").textContent = "+" + reward + " ✦";
  byId("result-time").textContent = formatTime(result.duration);
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
  playTone(390);
}

function resumeGame(): void {
  if (!game || !runActive || !paused) return;
  paused = false;
  pauseModal.hidden = true;
  game.resume();
  playTone(520);
}

async function initialize(): Promise<void> {
  try {
    save = await loadSave();
  } catch {
    save = createDefaultSave();
  }
  refreshMenu();
  showMenu();
}

document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => startRun(button.dataset.mode as GameMode));
});
byId("upgrade-attack").addEventListener("click", () => { void buyUpgrade("attack"); });
byId("upgrade-hull").addEventListener("click", () => { void buyUpgrade("hull"); });
byId("pause-button").addEventListener("click", pauseGame);
byId("resume-button").addEventListener("click", resumeGame);
byId("pause-menu-button").addEventListener("click", showMenu);
byId("result-menu-button").addEventListener("click", showMenu);
byId("retry-button").addEventListener("click", () => startRun(currentMode));
byId("special-button").addEventListener("click", () => {
  game?.specialAttack();
  playTone(1040, 0.12);
});
byId("shield-button").addEventListener("click", () => {
  game?.activateShield();
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
  if (audioContext) void audioContext.close();
});

void initialize();

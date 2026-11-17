import type { EnemyKind } from "./enemies";
import type { AttackPattern } from "./threatForecast";

export type ChapterId = "aurora-prime" | "pyra-reach" | "noctis-archive";
export type EndingId = "starborn" | "liberation" | "quiet-orbit" | "fractured-ring";
export type CampaignEventType = "echo-pulse" | "signal-exposure" | "rescue-support" | "memory-reversal" | "stasis-lock";
export type CampaignMissionKind = "main" | "side";
export interface CampaignChoice { readonly id: string; readonly title: string; readonly description: string; readonly pilotLine: string; }
export interface CampaignChapter {
  readonly id: ChapterId; readonly order: number; readonly planet: string; readonly title: string;
  readonly subtitle: string; readonly briefing: string; readonly mainMissionId: string; readonly choices: readonly CampaignChoice[];
}
export interface CampaignMission {
  readonly id: string; readonly chapterId: ChapterId; readonly kind: CampaignMissionKind;
  readonly title: string; readonly description: string; readonly reward: number;
}
export interface CampaignState {
  version: 1; choices: Record<ChapterId, string | null>; completedMissionIds: string[];
  activeMissionId: string | null; endingId: EndingId | null; endingHistory: EndingId[]; replayCount: number;
}
export interface CampaignWorldState { resonance: number; survivors: number; intel: number; trust: number; anomaly: number; coherence: number; }
export interface CampaignCombatProfile {
  readonly missionId: string; readonly chapterId: ChapterId; readonly missionTitle: string;
  readonly palette: { readonly background: number; readonly fog: number; readonly star: number; readonly fogDensity: number };
  readonly enemyPriority: readonly EnemyKind[];
  readonly enemyHealthMultiplier: number; readonly enemySpeedMultiplier: number;
  readonly enemyFireIntervalMultiplier: number; readonly spawnIntervalMultiplier: number;
  readonly bossName: string; readonly bossHealthMultiplier: number; readonly bossFireIntervalMultiplier: number;
  readonly bossProjectileSpeedMultiplier: number; readonly bossProjectileCountBonus: number;
  readonly bossSpreadMultiplier: number; readonly bossPattern: AttackPattern;
  readonly bossShieldDamageMultiplier: number; readonly battleEvent: CampaignEventType; readonly battleEventAtSeconds: number;
}

export const CAMPAIGN_CHAPTERS: readonly CampaignChapter[] = [
  {
    id: "aurora-prime", order: 1, planet: "Aurora Prime", title: "星の異常信号",
    subtitle: "THE SIGNAL THAT REMEMBERS",
    briefing: "氷晶の海に沈んだ観測都市から、撃墜されたはずの僚機の識別信号が届く。信号は受信者の記憶を読み取り、まだ起きていない選択まで先回りして応答している。",
    mainMissionId: "aurora-first-contact",
    choices: [
      { id: "attune", title: "信号に同調する", description: "未知の声を受け入れ、星環の記憶層へ接続する。敵の防衛網もこちらを学習するが、秘密の記録庫への道が開く。", pilotLine: "「怖くないと言ったら嘘。でも、あの声は誰かを待っている気がする」" },
      { id: "sever", title: "信号源を切り離す", description: "感染拡大を防ぎ、観測データを回収する。敵の狙撃部隊は増えるが、ボスの中継器を一時的に露出させられる。", pilotLine: "「誰かの声を利用する装置なら、ここで止める。記録だけは持ち帰ろう」" }
    ]
  },
  {
    id: "pyra-reach", order: 2, planet: "Pyra Reach", title: "生存と真実",
    subtitle: "THE PRICE OF A NAME",
    briefing: "赤い磁気嵐の中、輸送船団の救難ビーコンと敵艦の暗号通信が同時に点灯する。救助に向かえば暗号鍵は消え、追跡すれば船団の座標が失われる。",
    mainMissionId: "pyra-crossfire",
    choices: [
      { id: "rescue", title: "味方の救助を優先する", description: "生存者と信頼を得る。戦闘中に救援ドローンが一度だけシールドと特殊ゲージを補給する。", pilotLine: "「情報は後から探せる。でも、今ここにいる命は待ってくれない」" },
      { id: "pursue", title: "敵の暗号通信を追跡する", description: "敵の戦術情報を得る一方、救助隊との信頼を失う。敵編成は精密射撃型へ寄り、ボスの防壁を短時間だけ解析できる。", pilotLine: "「助けたい。でも、この通信の先にあるものを逃したら、もっと多くが消える」" }
    ]
  },
  {
    id: "noctis-archive", order: 3, planet: "Noctis Archive", title: "星環の真相",
    subtitle: "THE ARCHIVE OF TOMORROW",
    briefing: "星を取り巻く環状構造は兵器ではなかった。そこには、何度も失敗した世界の記憶が保存されている。通信の相手は敵でも味方でもなく、次の世界を選べないまま停止した未来のパイロットだった。",
    mainMissionId: "noctis-the-last-record",
    choices: [
      { id: "merge", title: "記憶を統合する", description: "過去の自分たちと共存する。記憶の反転がボスの第2形態を崩し、AuroraとPyraで築いた信頼が秘密の真相へつながる。", pilotLine: "「消すために戦ってきたんじゃない。ここに残された声も、私たちの未来にする」" },
      { id: "seal", title: "星環を封印する", description: "反復する記憶を断ち切る。最終戦では敵の斉射を一度だけ停止させるが、統合された記憶は失われる。", pilotLine: "「この循環を終わらせる。誰かの過去に、私たちの未来を預けない」" }
    ]
  }
] as const;

export const CAMPAIGN_MISSIONS: readonly CampaignMission[] = [
  { id: "aurora-first-contact", chapterId: "aurora-prime", kind: "main", title: "第一接触：氷晶観測都市", description: "信号源を守る無人防衛機を突破し、観測核へ到達する", reward: 30 },
  { id: "aurora-prism-vault", chapterId: "aurora-prime", kind: "side", title: "残響保管庫", description: "同調した信号の中に残る、未来の自分の記録を回収する", reward: 55 },
  { id: "aurora-silent-wreck", chapterId: "aurora-prime", kind: "side", title: "沈黙した残骸", description: "切り離した中継船から暗号化された航路図を回収する", reward: 55 },
  { id: "pyra-crossfire", chapterId: "pyra-reach", kind: "main", title: "二重遭難：赤熱宙域", description: "救難ビーコンと敵暗号通信、二つの座標が交差する宙域を突破する", reward: 40 },
  { id: "pyra-lifeline", chapterId: "pyra-reach", kind: "side", title: "最後の救命艇", description: "磁気嵐に取り残された輸送船の生存者を護衛する", reward: 70 },
  { id: "pyra-blackbox", chapterId: "pyra-reach", kind: "side", title: "黒箱の追跡者", description: "敵艦隊の戦術記録を奪い、次の迎撃座標を特定する", reward: 70 },
  { id: "noctis-the-last-record", chapterId: "noctis-archive", kind: "main", title: "最終記録：星環中枢", description: "三つの惑星で選んだ未来を背負い、星環の中枢へ進む", reward: 60 },
  { id: "noctis-memory-vault", chapterId: "noctis-archive", kind: "side", title: "明日を記す部屋", description: "失敗した世界の記憶から、まだ誰も選ばなかった航路を探す", reward: 120 }
] as const;

export const CAMPAIGN_ENDINGS: Record<EndingId, { title: string; description: string }> = {
  starborn: { title: "STAR BORN — 星環の継承者", description: "生存者と記憶の双方を未来へつないだ。過去のパイロットたちは敵ではなく、次の航路を照らす観測者となる。星環は選択を奪う装置から、選択を記録する灯台へ変わった。" },
  liberation: { title: "OPEN ORBIT — 開かれた軌道", description: "救助した人々が星環の中枢を支え、誰も一人で未来を決めなくてよい航路が生まれた。失った情報は残るが、救い上げた命が新しい地図を描き始める。" },
  "quiet-orbit": { title: "QUIET ORBIT — 静かな封印", description: "星環は封印され、反復する未来は止まった。記録は失われたが、同じ悲劇を繰り返さないための航路標識が残された。" },
  "fractured-ring": { title: "FRACTURED RING — 砕けた星環", description: "星環は崩壊し、誰も完全な答えを得られなかった。それでも三つの惑星で交わした約束だけは、次の航海へ持ち越された。" }
};

const DEFAULT_CHOICES: Record<ChapterId, string | null> = { "aurora-prime": null, "pyra-reach": null, "noctis-archive": null };
const knownMissionIds = new Set(CAMPAIGN_MISSIONS.map((mission) => mission.id));
const knownEndingIds = new Set<EndingId>(Object.keys(CAMPAIGN_ENDINGS) as EndingId[]);

export function createCampaignState(): CampaignState {
  return { version: 1, choices: { ...DEFAULT_CHOICES }, completedMissionIds: [], activeMissionId: null, endingId: null, endingHistory: [], replayCount: 0 };
}
function isChoiceAllowed(chapterId: ChapterId, value: unknown): value is string {
  return CAMPAIGN_CHAPTERS.find((chapter) => chapter.id === chapterId)?.choices.some((choice) => choice.id === value) ?? false;
}
export function sanitizeCampaignState(value: unknown): CampaignState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return createCampaignState();
  const source = value as Record<string, unknown>;
  const raw = source.choices && typeof source.choices === "object" && !Array.isArray(source.choices) ? source.choices as Record<string, unknown> : {};
  const choices = { ...DEFAULT_CHOICES };
  for (const chapter of CAMPAIGN_CHAPTERS) if (isChoiceAllowed(chapter.id, raw[chapter.id])) choices[chapter.id] = String(raw[chapter.id]);
  const completedMissionIds = Array.isArray(source.completedMissionIds)
    ? [...new Set(source.completedMissionIds.filter((id): id is string => typeof id === "string" && knownMissionIds.has(id)))].slice(0, 16) : [];
  const activeMissionId = typeof source.activeMissionId === "string" && knownMissionIds.has(source.activeMissionId) ? source.activeMissionId : null;
  const endingId = typeof source.endingId === "string" && knownEndingIds.has(source.endingId as EndingId) ? source.endingId as EndingId : null;
  const endingHistory = Array.isArray(source.endingHistory)
    ? source.endingHistory.filter((id): id is EndingId => typeof id === "string" && knownEndingIds.has(id as EndingId)).slice(-8) : [];
  const replayCount = typeof source.replayCount === "number" && Number.isFinite(source.replayCount) ? Math.min(1000, Math.max(0, Math.floor(source.replayCount))) : 0;
  return { version: 1, choices, completedMissionIds, activeMissionId, endingId, endingHistory, replayCount };
}
export function getCampaignMission(id: string): CampaignMission | null { return CAMPAIGN_MISSIONS.find((mission) => mission.id === id) ?? null; }
export function getCampaignChapter(id: ChapterId): CampaignChapter {
  const chapter = CAMPAIGN_CHAPTERS.find((entry) => entry.id === id);
  if (!chapter) throw new RangeError("Unknown campaign chapter: " + id);
  return chapter;
}
export function getNextCampaignChapter(state: CampaignState): CampaignChapter | null {
  return CAMPAIGN_CHAPTERS.find((chapter) => !state.completedMissionIds.includes(chapter.mainMissionId)) ?? null;
}
export function getCampaignProgress(state: CampaignState): { completed: number; total: number } {
  return { completed: CAMPAIGN_CHAPTERS.filter((chapter) => state.completedMissionIds.includes(chapter.mainMissionId)).length, total: CAMPAIGN_CHAPTERS.length };
}
export function selectCampaignChoice(state: CampaignState, chapterId: ChapterId, choiceId: string): CampaignState {
  const chapter = getCampaignChapter(chapterId);
  const nextChapter = getNextCampaignChapter(state);
  if (!isChoiceAllowed(chapterId, choiceId) || state.completedMissionIds.includes(chapter.mainMissionId) || nextChapter?.id !== chapterId) return state;
  return { ...state, choices: { ...state.choices, [chapterId]: choiceId }, endingId: null, activeMissionId: null };
}
export function deriveCampaignWorld(state: CampaignState): CampaignWorldState {
  const world: CampaignWorldState = { resonance: 0, survivors: 0, intel: 0, trust: 0, anomaly: 0, coherence: 0 };
  if (state.choices["aurora-prime"] === "attune") { world.resonance += 2; world.trust += 1; world.anomaly += 1; }
  else if (state.choices["aurora-prime"] === "sever") { world.intel += 2; world.anomaly -= 1; }
  if (state.choices["pyra-reach"] === "rescue") { world.survivors += 3; world.trust += 2; }
  else if (state.choices["pyra-reach"] === "pursue") { world.intel += 3; world.trust -= 1; world.anomaly += 1; }
  if (state.choices["noctis-archive"] === "merge") { world.resonance += 1; world.trust += 1; world.anomaly += 2; }
  else if (state.choices["noctis-archive"] === "seal") { world.anomaly -= 2; world.coherence += 1; }
  for (const id of state.completedMissionIds) {
    switch (id) {
      case "aurora-prism-vault": world.resonance += 1; world.intel += 1; break;
      case "aurora-silent-wreck": world.intel += 2; world.anomaly -= 1; break;
      case "pyra-lifeline": world.survivors += 2; world.trust += 1; break;
      case "pyra-blackbox": world.intel += 2; world.anomaly += 1; break;
      case "noctis-memory-vault": world.resonance += 2; world.coherence += 2; break;
    }
  }
  return world;
}
export function getAvailableCampaignMissions(state: CampaignState): CampaignMission[] {
  const result: CampaignMission[] = [];
  const nextChapter = getNextCampaignChapter(state);
  if (nextChapter && state.choices[nextChapter.id]) {
    const main = getCampaignMission(nextChapter.mainMissionId);
    if (main) result.push(main);
  }
  const done = new Set(state.completedMissionIds);
  const auroraId = state.choices["aurora-prime"] === "attune" ? "aurora-prism-vault" : state.choices["aurora-prime"] === "sever" ? "aurora-silent-wreck" : null;
  if (done.has("aurora-first-contact") && auroraId && !done.has(auroraId)) { const mission = getCampaignMission(auroraId); if (mission) result.push(mission); }
  const pyraId = state.choices["pyra-reach"] === "rescue" ? "pyra-lifeline" : state.choices["pyra-reach"] === "pursue" ? "pyra-blackbox" : null;
  if (done.has("pyra-crossfire") && pyraId && !done.has(pyraId)) { const mission = getCampaignMission(pyraId); if (mission) result.push(mission); }
  const world = deriveCampaignWorld(state);
  if (done.has("pyra-crossfire") && state.choices["aurora-prime"] === "attune" && state.choices["pyra-reach"] === "rescue" &&
      state.choices["noctis-archive"] === "merge" && world.resonance >= 2 && world.trust >= 3 && !done.has("noctis-memory-vault")) {
    const mission = getCampaignMission("noctis-memory-vault"); if (mission) result.push(mission);
  }
  return result;
}
export function activateCampaignMission(state: CampaignState, missionId: string): CampaignState {
  return getAvailableCampaignMissions(state).some((mission) => mission.id === missionId) ? { ...state, activeMissionId: missionId } : state;
}
export function resolveCampaignEnding(state: CampaignState): EndingId {
  const world = deriveCampaignWorld(state);
  if (state.completedMissionIds.includes("noctis-memory-vault") && state.choices["aurora-prime"] === "attune" &&
      state.choices["pyra-reach"] === "rescue" && state.choices["noctis-archive"] === "merge") return "starborn";
  if (world.survivors >= 4 && world.trust >= 2) return "liberation";
  if (state.choices["noctis-archive"] === "seal" && world.anomaly <= 0 && world.intel >= 3) return "quiet-orbit";
  return "fractured-ring";
}
export function completeCampaignMission(state: CampaignState, missionId: string, status: "clear" | "gameover"): CampaignState {
  if (!getCampaignMission(missionId)) return state;
  if (status !== "clear") return { ...state, activeMissionId: missionId };
  const completedMissionIds = [...new Set([...state.completedMissionIds, missionId])];
  let next: CampaignState = { ...state, completedMissionIds, activeMissionId: null };
  if (CAMPAIGN_CHAPTERS.every((chapter) => completedMissionIds.includes(chapter.mainMissionId))) {
    const endingId = resolveCampaignEnding(next);
    next = { ...next, endingId, endingHistory: [...next.endingHistory, endingId].slice(-8) };
  }
  return next;
}
export function startNewCampaignRoute(state: CampaignState): CampaignState {
  return { ...createCampaignState(), replayCount: Math.min(1000, state.replayCount + 1), endingHistory: state.endingHistory.slice(-8) };
}
export function createCampaignCombatProfile(state: CampaignState, missionId: string): CampaignCombatProfile | null {
  const mission = getCampaignMission(missionId);
  if (!mission) return null;
  const world = deriveCampaignWorld(state);
  const pressure = Math.max(-0.12, Math.min(0.28, world.intel * 0.035 + world.anomaly * 0.03 - world.survivors * 0.02));
  const secret = state.completedMissionIds.includes("noctis-memory-vault");
  const enemyPriority: readonly EnemyKind[] = mission.chapterId === "aurora-prime"
    ? world.resonance >= world.intel ? ["guardian", "heavy", "elite", "scout", "interceptor"] : ["sniper", "missile", "interceptor", "bomber", "scout"]
    : mission.chapterId === "pyra-reach"
      ? world.survivors >= 3 ? ["interceptor", "swarm", "bomber", "scout", "guardian"] : ["sniper", "missile", "elite", "interceptor", "scout"]
      : secret ? ["elite", "guardian", "missile", "interceptor", "sniper"] : ["heavy", "sniper", "bomber", "guardian", "elite"];
  const battleEvent: CampaignEventType = mission.chapterId === "aurora-prime"
    ? state.choices["aurora-prime"] === "attune" ? "echo-pulse" : "signal-exposure"
    : mission.chapterId === "pyra-reach"
      ? state.choices["pyra-reach"] === "rescue" ? "rescue-support" : "signal-exposure"
      : state.choices["noctis-archive"] === "merge" ? "memory-reversal" : "stasis-lock";
  const palette = mission.chapterId === "aurora-prime"
    ? { background: 0x07152b, fog: 0x14284b, star: 0x9feaff, fogDensity: 0.009 }
    : mission.chapterId === "pyra-reach"
      ? { background: 0x230e1d, fog: 0x56233b, star: 0xffb77f, fogDensity: 0.011 }
      : { background: 0x100e2c, fog: 0x29215a, star: 0xc9a8ff, fogDensity: 0.0085 };
  const bossName = mission.chapterId === "aurora-prime" ? "PRISM WARDEN" : mission.chapterId === "pyra-reach" ? "CINDER BAILIFF" : secret ? "THE STARBORN ARCHIVE" : "NOCTIS REGISTRAR";
  return {
    missionId, chapterId: mission.chapterId, missionTitle: mission.title, palette, enemyPriority,
    enemyHealthMultiplier: Math.max(0.88, Math.min(1.28, 1 + pressure)),
    enemySpeedMultiplier: Math.max(0.9, Math.min(1.2, 1 + world.anomaly * 0.035)),
    enemyFireIntervalMultiplier: Math.max(0.78, Math.min(1.08, 1 - world.intel * 0.025 + world.trust * 0.018)),
    spawnIntervalMultiplier: Math.max(0.78, Math.min(1.18, 1 + world.survivors * 0.025 - world.anomaly * 0.025)),
    bossName,
    bossHealthMultiplier: Math.max(0.82, Math.min(1.35, 1 + world.intel * 0.04 + world.anomaly * 0.035 - world.survivors * 0.025)),
    bossFireIntervalMultiplier: Math.max(0.76, Math.min(1.16, 1 + world.trust * 0.03 - world.anomaly * 0.025)),
    bossProjectileSpeedMultiplier: Math.max(0.9, Math.min(1.2, 1 + world.anomaly * 0.03)),
    bossProjectileCountBonus: Math.max(-1, Math.min(2, Math.floor((world.intel + world.anomaly) / 3) - (world.survivors >= 3 ? 1 : 0))),
    bossSpreadMultiplier: Math.max(0.8, Math.min(1.25, 1 + world.resonance * 0.02 - world.intel * 0.012)),
    bossPattern: mission.chapterId === "noctis-archive" && state.choices["noctis-archive"] === "merge" ? "homing"
      : mission.chapterId === "pyra-reach" && state.choices["pyra-reach"] === "pursue" ? "aimed" : "spread",
    bossShieldDamageMultiplier: Math.max(0.48, Math.min(0.72, 0.65 - world.intel * 0.018)),
    battleEvent, battleEventAtSeconds: 18
  };
}

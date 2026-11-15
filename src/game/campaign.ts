export type PlanetId = "aurora-prime" | "pyra-reach" | "noctis-archive";
export type BossId = "nebula-empress" | "rift-wyrm" | "aegis-colossus";
export type BossAttackPattern = "fan" | "seeker" | "cross";
export type PlanetEventKind = "resonance" | "gravity-shear" | "archive-ward";

export interface PlanetEventProfile {
  id: string;
  name: string;
  triggerAtSeconds: number;
  durationSeconds: number;
  kind: PlanetEventKind;
  pilotDialogue: Readonly<Record<string, string>>;
}

export interface BossProfile {
  id: BossId;
  name: string;
  subtitle: string;
  maxHp: number;
  attackPattern: BossAttackPattern;
  weakpointMultiplier: number;
  rewardShards: number;
  scoreReward: number;
}

export interface PlanetProfile {
  id: PlanetId;
  name: string;
  sector: string;
  description: string;
  event: string;
  missionEvent: PlanetEventProfile;
  backgroundColor: number;
  fogColor: number;
  boss: BossProfile;
  pilotBriefings: Readonly<Record<string, string>>;
  missionLog: string;
}

export const PLANET_ORDER: readonly PlanetId[] = ["aurora-prime", "pyra-reach", "noctis-archive"];

export const PLANETS: Readonly<Record<PlanetId, PlanetProfile>> = {
  "aurora-prime": {
    id: "aurora-prime",
    name: "オーロラ・プライム",
    sector: "SECTOR 01 · LUMINOUS BELT",
    description: "星雲の光が絶えず流れる、最初の航路。",
    event: "星雲の中心に巨大反応。敵艦のコアが短時間だけ露出する！",
    missionEvent: {
      id: "starlight-resonance",
      name: "星灯り共鳴",
      triggerAtSeconds: 16,
      durationSeconds: 8,
      kind: "resonance",
      pilotDialogue: {
        "lumi-asteria": "ルミ「この光は味方だよ！ 武器出力が上がってる、今のうちに突破しよう！」",
        "noa-celeste": "ノア「星雲の位相が同期したわ。攻撃出力を一時的に増幅できる。」",
        "rin-vega": "リン「追い風きた！ ここで一気にスコアを稼ぐよ！」"
      }
    },
    backgroundColor: 0x07122d,
    fogColor: 0x17285b,
    boss: {
      id: "nebula-empress", name: "ネビュラ・エンプレス", subtitle: "星雲を統べる観測者",
      maxHp: 210, attackPattern: "fan", weakpointMultiplier: 2.2, rewardShards: 45, scoreReward: 2500
    },
    pilotBriefings: {
      "lumi-asteria": "ルミ「星の地図にない光だね……でも、進めば答えが見つかるはず！」",
      "noa-celeste": "ノア「観測値が揺らいでいるわ。コアの開放周期を見逃さないで。」",
      "rin-vega": "リン「最初の相手が女王様？ いいね、派手に突破しよう！」"
    },
    missionLog: "航路に残された謎の信号を追跡し、星雲の制御装置を停止せよ。"
  },
  "pyra-reach": {
    id: "pyra-reach",
    name: "パイラ・リーチ",
    sector: "SECTOR 02 · EMBER FRONTIER",
    description: "赤熱した小惑星群と、不規則な重力嵐の惑星帯。",
    event: "重力嵐が接近。敵の追尾弾を誘導し、開いた隙を狙え！",
    missionEvent: {
      id: "gravity-shear",
      name: "重力剪断",
      triggerAtSeconds: 18,
      durationSeconds: 8,
      kind: "gravity-shear",
      pilotDialogue: {
        "lumi-asteria": "ルミ「重力嵐が来るよ！ 敵弾の速度が上がるから、軌道をよく見て！」",
        "noa-celeste": "ノア「重力勾配が変わったわ。敵弾の到達時間を読み直して。」",
        "rin-vega": "リン「弾が速くなるなら、もっと速く動けばいいだけ！」"
      }
    },
    backgroundColor: 0x241020,
    fogColor: 0x6b263f,
    boss: {
      id: "rift-wyrm", name: "リフト・ワーム", subtitle: "裂け目を泳ぐ巨竜",
      maxHp: 265, attackPattern: "seeker", weakpointMultiplier: 2.5, rewardShards: 65, scoreReward: 3400
    },
    pilotBriefings: {
      "lumi-asteria": "ルミ「重力が変わっても、私たちの航路は変えないよ！」",
      "noa-celeste": "ノア「追尾弾の旋回には限界があるわ。距離を保って。」",
      "rin-vega": "リン「追尾してくるなら、追いつけない速度で振り切るだけ！」"
    },
    missionLog: "重力異常の発生源を特定し、裂け目の向こうから現れた巨竜を撃退せよ。"
  },
  "noctis-archive": {
    id: "noctis-archive",
    name: "ノクティス・アーカイブ",
    sector: "SECTOR 03 · LOST MEMORY",
    description: "失われた文明の記録が眠る、暗黒の外縁宙域。",
    event: "古代防衛機構が起動。十字砲火の予告線から離脱せよ！",
    missionEvent: {
      id: "archive-ward",
      name: "アーカイブ防壁",
      triggerAtSeconds: 20,
      durationSeconds: 7,
      kind: "archive-ward",
      pilotDialogue: {
        "lumi-asteria": "ルミ「古代の記録が防壁を起動したみたい。今なら守りを固められる！」",
        "noa-celeste": "ノア「防衛機構が味方認証を行ったわ。シールドを最大限に活用して。」",
        "rin-vega": "リン「守りがあるうちに攻める！ 一気に片をつけよう！」"
      }
    },
    backgroundColor: 0x090e24,
    fogColor: 0x34305f,
    boss: {
      id: "aegis-colossus", name: "アイギス・コロッサス", subtitle: "記憶を守る古代巨兵",
      maxHp: 320, attackPattern: "cross", weakpointMultiplier: 2.8, rewardShards: 90, scoreReward: 4600
    },
    pilotBriefings: {
      "lumi-asteria": "ルミ「この記録……私たちの船団の起源と関係があるの？」",
      "noa-celeste": "ノア「防衛機構の記録を回収しましょう。ここで終わらせてはいけない。」",
      "rin-vega": "リン「最後の扉ってわけね。だったら正面から開けてみせる！」"
    },
    missionLog: "古代アーカイブの防衛機構を停止し、失われた星図の断片を回収せよ。"
  }
};

export const ALL_PLANET_IDS = Object.freeze([...PLANET_ORDER]);
export const ALL_BOSS_IDS = Object.freeze(PLANET_ORDER.map((id) => PLANETS[id].boss.id));

export function isPlanetId(value: string): value is PlanetId {
  return (PLANET_ORDER as readonly string[]).includes(value);
}

export function isBossId(value: string): value is BossId {
  return (ALL_BOSS_IDS as readonly string[]).includes(value);
}

export function getPlanetProfile(value: string): PlanetProfile {
  return PLANETS[isPlanetId(value) ? value : PLANET_ORDER[0]];
}

export function getEndlessBossProfile(sequence: number): BossProfile {
  const safe = Number.isFinite(sequence) ? Math.max(0, Math.floor(sequence)) : 0;
  return getPlanetProfile(PLANET_ORDER[safe % PLANET_ORDER.length]).boss;
}

export function normalizeCompletedPlanetIds(values: readonly string[]): PlanetId[] {
  const completed: PlanetId[] = [];
  for (const id of PLANET_ORDER) {
    if (!values.includes(id)) break;
    completed.push(id);
  }
  return completed;
}

export function isPlanetUnlocked(value: string, completed: readonly PlanetId[]): boolean {
  if (!isPlanetId(value)) return false;
  const index = PLANET_ORDER.indexOf(value);
  return index === 0 || completed.includes(PLANET_ORDER[index - 1]);
}

export function normalizeSelectedPlanetId(value: string, completed: readonly PlanetId[]): PlanetId {
  return isPlanetUnlocked(value, completed) ? value as PlanetId
    : PLANET_ORDER.find((id) => isPlanetUnlocked(id, completed)) ?? PLANET_ORDER[0];
}

export function normalizeBossCollectionIds(values: readonly string[]): BossId[] {
  return ALL_BOSS_IDS.filter((id) => values.includes(id));
}

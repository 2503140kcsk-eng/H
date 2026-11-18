export type PilotId = "lumi-asteria" | "noa-celeste" | "rin-vega";

export interface PilotProfile {
  id: PilotId;
  name: string;
  callSign: string;
  className: string;
  description: string;
  biography: string;
  unlockCost: number;
  attackMultiplier: number;
  fireIntervalMultiplier: number;
  movementMultiplier: number;
  hullBonus: number;
  shieldRechargeMultiplier: number;
  specialMultiplier: number;
  accentColor: number;
  avatar: string;
}

export const PILOT_PROFILES: Readonly<Record<PilotId, PilotProfile>> = {
  "lumi-asteria": {
    id: "lumi-asteria",
    name: "ルミ・アステリア",
    callSign: "LUMI",
    className: "オールラウンダー / STAR GUIDE",
    description: "攻守と機動力のバランスに優れた新人パイロット",
    biography: "星図を読むのが得意な、前向きで少しあわてんぼうの航宙士。",
    unlockCost: 0,
    attackMultiplier: 1,
    fireIntervalMultiplier: 1,
    movementMultiplier: 1,
    hullBonus: 0,
    shieldRechargeMultiplier: 1,
    specialMultiplier: 1,
    accentColor: 0xffa4d8,
    avatar: "✦"
  },
  "noa-celeste": {
    id: "noa-celeste",
    name: "ノア・セレステ",
    callSign: "NOA",
    className: "サポート / AEGIS",
    description: "装甲とシールド回復、必殺技の効率に特化",
    biography: "静かな観測士。味方を守る航法シールドの研究者でもある。",
    unlockCost: 420,
    attackMultiplier: 0.94,
    fireIntervalMultiplier: 1.06,
    movementMultiplier: 0.96,
    hullBonus: 1,
    shieldRechargeMultiplier: 1.4,
    specialMultiplier: 1.25,
    accentColor: 0x74e7ff,
    avatar: "◇"
  },
  "rin-vega": {
    id: "rin-vega",
    name: "リン・ヴェガ",
    callSign: "RIN",
    className: "アサルト / COMET ACE",
    description: "高速機動と高火力で敵を押し切るエース",
    biography: "勝ち気な競争好き。危険な小惑星帯でも最短コースを選ぶ。",
    unlockCost: 650,
    attackMultiplier: 1.16,
    fireIntervalMultiplier: 0.92,
    movementMultiplier: 1.12,
    hullBonus: 0,
    shieldRechargeMultiplier: 0.88,
    specialMultiplier: 0.92,
    accentColor: 0xff82b7,
    avatar: "☄"
  }
};

export const DEFAULT_PILOT_ID: PilotId = "lumi-asteria";
export const ALL_PILOT_IDS = Object.freeze(Object.keys(PILOT_PROFILES) as PilotId[]);

export function isPilotId(value: string): value is PilotId {
  return Object.prototype.hasOwnProperty.call(PILOT_PROFILES, value);
}

export function getPilotProfile(value: string): PilotProfile {
  return PILOT_PROFILES[isPilotId(value) ? value : DEFAULT_PILOT_ID];
}

export function normalizeUnlockedPilotIds(values: readonly string[]): PilotId[] {
  const valid = ALL_PILOT_IDS.filter((id) => values.includes(id));
  return valid.includes(DEFAULT_PILOT_ID) ? valid : [DEFAULT_PILOT_ID, ...valid];
}

export function normalizeSelectedPilotId(value: string, unlocked: readonly PilotId[]): PilotId {
  return isPilotId(value) && unlocked.includes(value) ? value : DEFAULT_PILOT_ID;
}


export interface PilotGrowthStats {
  level: number;
  attackMultiplier: number;
  hullBonus: number;
}

export function getPilotGrowthStats(level: number): PilotGrowthStats {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.min(100, Math.floor(level))) : 1;
  return {
    level: safeLevel,
    attackMultiplier: 1 + Math.min(20, safeLevel - 1) * 0.01,
    hullBonus: Math.floor((safeLevel - 1) / 10)
  };
}

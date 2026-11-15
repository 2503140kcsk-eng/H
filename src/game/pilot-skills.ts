import type { PilotId } from "./pilots";

export type PilotSkillId =
  | "lumi-stellar-focus" | "lumi-combo-catalyst" | "lumi-orbit-reader"
  | "noa-aegis-frame" | "noa-resonance-guard" | "noa-last-sanctuary"
  | "rin-comet-vector" | "rin-afterburn" | "rin-ace-instinct";

export interface PilotSkill {
  id: PilotSkillId;
  pilotId: PilotId;
  name: string;
  description: string;
  unlockLevel: number;
  requires: PilotSkillId | null;
  branch: "core" | "left" | "right";
}

export interface PilotSkillBonuses {
  attackMultiplier: number;
  fireIntervalMultiplier: number;
  movementMultiplier: number;
  shieldRechargeMultiplier: number;
  specialMultiplier: number;
  comboMultiplier: number;
  weakpointMultiplier: number;
  hullBonus: number;
}

export const PILOT_SKILL_TREES: Readonly<Record<PilotId, readonly PilotSkill[]>> = {
  "lumi-asteria": [
    { id: "lumi-stellar-focus", pilotId: "lumi-asteria", name: "星図集中", description: "照準を星の流れに同期。与ダメージ +8%。", unlockLevel: 2, requires: null, branch: "core" },
    { id: "lumi-combo-catalyst", pilotId: "lumi-asteria", name: "共鳴コンボ", description: "コンボスコア倍率 +15%。", unlockLevel: 4, requires: "lumi-stellar-focus", branch: "left" },
    { id: "lumi-orbit-reader", pilotId: "lumi-asteria", name: "軌道予測", description: "ボス弱点へのダメージ +20%。", unlockLevel: 6, requires: "lumi-stellar-focus", branch: "right" }
  ],
  "noa-celeste": [
    { id: "noa-aegis-frame", pilotId: "noa-celeste", name: "アエギス骨格", description: "最大耐久 +1。", unlockLevel: 2, requires: null, branch: "core" },
    { id: "noa-resonance-guard", pilotId: "noa-celeste", name: "共鳴障壁", description: "シールド回復速度 +25%。", unlockLevel: 4, requires: "noa-aegis-frame", branch: "left" },
    { id: "noa-last-sanctuary", pilotId: "noa-celeste", name: "最後の聖域", description: "必殺技の防御効果 +25%。", unlockLevel: 6, requires: "noa-aegis-frame", branch: "right" }
  ],
  "rin-vega": [
    { id: "rin-comet-vector", pilotId: "rin-vega", name: "彗星ベクトル", description: "機動力 +8%。", unlockLevel: 2, requires: null, branch: "core" },
    { id: "rin-afterburn", pilotId: "rin-vega", name: "アフターバーナー", description: "連射間隔を 8% 短縮。", unlockLevel: 4, requires: "rin-comet-vector", branch: "left" },
    { id: "rin-ace-instinct", pilotId: "rin-vega", name: "エースの直感", description: "与ダメージ +10%。", unlockLevel: 6, requires: "rin-comet-vector", branch: "right" }
  ]
};

const EMPTY_BONUSES: PilotSkillBonuses = {
  attackMultiplier: 1,
  fireIntervalMultiplier: 1,
  movementMultiplier: 1,
  shieldRechargeMultiplier: 1,
  specialMultiplier: 1,
  comboMultiplier: 1,
  weakpointMultiplier: 1,
  hullBonus: 0
};

export function getPilotSkills(pilotId: string): readonly PilotSkill[] {
  return Object.values(PILOT_SKILL_TREES).flat().filter((skill) => skill.pilotId === pilotId);
}

export function getUnspentSkillPoints(level: number, unlocked: readonly string[]): number {
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.min(100, Math.floor(level))) : 1;
  return Math.max(0, safeLevel - 1 - unlocked.length);
}

export function canUnlockPilotSkill(
  pilotId: string,
  skillId: string,
  level: number,
  unlocked: readonly string[]
): boolean {
  const skill = getPilotSkills(pilotId).find((entry) => entry.id === skillId);
  if (!skill || unlocked.includes(skill.id) || level < skill.unlockLevel) return false;
  if (skill.requires && !unlocked.includes(skill.requires)) return false;
  return getUnspentSkillPoints(level, unlocked) > 0;
}

export function normalizePilotSkills(
  value: Readonly<Record<string, unknown>>,
  unlockedPilots: readonly string[],
  progress: Readonly<Record<string, { level: number; xp: number }>>
): Record<string, string[]> {
  const output: Record<string, string[]> = {};
  for (const pilotId of unlockedPilots) {
    const available = getPilotSkills(pilotId);
    const requested = Array.isArray(value[pilotId])
      ? (value[pilotId] as unknown[]).filter((entry): entry is string => typeof entry === "string")
      : [];
    const level = progress[pilotId]?.level ?? 1;
    const accepted: string[] = [];
    for (const skill of available) {
      if (requested.includes(skill.id) && level >= skill.unlockLevel &&
          (!skill.requires || accepted.includes(skill.requires)) &&
          accepted.length < level - 1) {
        accepted.push(skill.id);
      }
    }
    output[pilotId] = accepted;
  }
  return output;
}

export function getPilotSkillBonuses(pilotId: string, unlocked: readonly string[]): PilotSkillBonuses {
  const bonuses = { ...EMPTY_BONUSES };
  for (const id of unlocked) {
    switch (id) {
      case "lumi-stellar-focus": bonuses.attackMultiplier *= 1.08; break;
      case "lumi-combo-catalyst": bonuses.comboMultiplier *= 1.15; break;
      case "lumi-orbit-reader": bonuses.weakpointMultiplier *= 1.2; break;
      case "noa-aegis-frame": bonuses.hullBonus += 1; break;
      case "noa-resonance-guard": bonuses.shieldRechargeMultiplier *= 1.25; break;
      case "noa-last-sanctuary": bonuses.specialMultiplier *= 1.25; break;
      case "rin-comet-vector": bonuses.movementMultiplier *= 1.08; break;
      case "rin-afterburn": bonuses.fireIntervalMultiplier *= 0.92; break;
      case "rin-ace-instinct": bonuses.attackMultiplier *= 1.1; break;
      default: break;
    }
  }
  return bonuses;
}

export function normalizeSkillTreeInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

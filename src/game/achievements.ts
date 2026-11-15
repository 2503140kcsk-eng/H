import { ALL_WEAPON_IDS, type WeaponId } from "./weapons";

export interface AchievementProfile {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: readonly AchievementProfile[] = [
  { id: "first-flight", name: "初飛行", description: "最初の出撃を完了する" },
  { id: "core-breaker", name: "コアブレイカー", description: "ボスを1体撃破する" },
  { id: "ace-pilot", name: "エースの証", description: "1 sortie で50機撃破する" },
  { id: "star-score", name: "星を越える者", description: "1 sortie で5,000点を獲得する" },
  { id: "arsenal", name: "全武装解放", description: "4種類の武器をすべて解放する" },
  { id: "galaxy-keeper", name: "銀河の守護者", description: "3惑星のキャンペーンを完了する" }
] as const;

const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((entry) => entry.id));

export function normalizeAchievementIds(values: readonly string[]): string[] {
  return ACHIEVEMENTS.map((entry) => entry.id).filter((id) => values.includes(id));
}

export interface AchievementStats {
  totalRuns: number;
  kills: number;
  score: number;
  bossesDefeated: readonly string[];
  completedPlanets: readonly string[];
  unlockedWeapons: readonly WeaponId[];
}

export function evaluateAchievements(stats: AchievementStats, alreadyUnlocked: readonly string[]): string[] {
  const unlocked = new Set(normalizeAchievementIds(alreadyUnlocked));
  const conditions: Readonly<Record<string, boolean>> = {
    "first-flight": stats.totalRuns >= 1,
    "core-breaker": stats.bossesDefeated.length >= 1,
    "ace-pilot": stats.kills >= 50,
    "star-score": stats.score >= 5000,
    arsenal: ALL_WEAPON_IDS.every((id) => stats.unlockedWeapons.includes(id)),
    "galaxy-keeper": stats.completedPlanets.length >= 3
  };
  return [...ACHIEVEMENT_IDS].filter((id) => conditions[id] && !unlocked.has(id));
}

export type WeaponId = "star-pulse" | "prism-fan" | "nova-lance";
export type WeaponVisual = "pulse" | "fan" | "lance";

export interface WeaponProfile {
  id: WeaponId;
  name: string;
  callSign: string;
  description: string;
  unlockCost: number;
  projectileCount: number;
  spreadRadians: number;
  damageMultiplier: number;
  fireIntervalMultiplier: number;
  projectileSpeed: number;
  projectileRadius: number;
  pierceTargets: number;
  tint: number;
  visual: WeaponVisual;
}

export const WEAPON_PROFILES: Readonly<Record<WeaponId, WeaponProfile>> = {
  "star-pulse": {
    id: "star-pulse", name: "スター・パルス", callSign: "STAR PULSE",
    description: "扱いやすい標準単発。威力・連射・弾速の基準兵装。",
    unlockCost: 0, projectileCount: 1, spreadRadians: 0, damageMultiplier: 1,
    fireIntervalMultiplier: 1, projectileSpeed: 15.5, projectileRadius: 0.14,
    pierceTargets: 0, tint: 0x8cf5ff, visual: "pulse"
  },
  "prism-fan": {
    id: "prism-fan", name: "プリズム・ファン", callSign: "PRISM FAN",
    description: "3方向へ拡散。複数の敵をまとめて狙う広域兵装。",
    unlockCost: 380, projectileCount: 3, spreadRadians: 0.16, damageMultiplier: 0.42,
    fireIntervalMultiplier: 1.12, projectileSpeed: 14.5, projectileRadius: 0.14,
    pierceTargets: 0, tint: 0xffdc83, visual: "fan"
  },
  "nova-lance": {
    id: "nova-lance", name: "ノヴァ・ランス", callSign: "NOVA LANCE",
    description: "高威力の貫通弾。連射は遅いが、追加の敵1体まで貫く。",
    unlockCost: 720, projectileCount: 1, spreadRadians: 0, damageMultiplier: 1.75,
    fireIntervalMultiplier: 1.5, projectileSpeed: 19, projectileRadius: 0.19,
    pierceTargets: 1, tint: 0xff91e8, visual: "lance"
  }
};

export const DEFAULT_WEAPON_ID: WeaponId = "star-pulse";
export const ALL_WEAPON_IDS = Object.freeze(Object.keys(WEAPON_PROFILES) as WeaponId[]);

export interface WeaponShotSpec {
  spreadRadians: number;
  damageMultiplier: number;
  projectileSpeed: number;
  projectileRadius: number;
  pierceTargets: number;
  tint: number;
  visual: WeaponVisual;
}

export function isWeaponId(value: string): value is WeaponId {
  return Object.prototype.hasOwnProperty.call(WEAPON_PROFILES, value);
}

export function getWeaponProfile(value: string): WeaponProfile {
  return WEAPON_PROFILES[isWeaponId(value) ? value : DEFAULT_WEAPON_ID];
}

export function normalizeUnlockedWeaponIds(values: readonly string[]): WeaponId[] {
  const valid = ALL_WEAPON_IDS.filter((id) => values.includes(id));
  return valid.includes(DEFAULT_WEAPON_ID) ? valid : [DEFAULT_WEAPON_ID, ...valid];
}

export function normalizeSelectedWeaponId(value: string, unlocked: readonly WeaponId[]): WeaponId {
  return isWeaponId(value) && unlocked.includes(value) ? value : DEFAULT_WEAPON_ID;
}

export function createWeaponShotSpecs(weaponId: string, bonusProjectiles = 0): WeaponShotSpec[] {
  const weapon = getWeaponProfile(weaponId);
  const bonus = Number.isFinite(bonusProjectiles)
    ? Math.max(0, Math.min(4, Math.floor(bonusProjectiles)))
    : 0;
  const count = Math.min(5, weapon.projectileCount + bonus);
  const step = count > 1 ? (weapon.spreadRadians > 0 ? weapon.spreadRadians : 0.105) : 0;
  return Array.from({ length: count }, (_, index) => ({
    spreadRadians: (index - (count - 1) / 2) * step,
    damageMultiplier: weapon.damageMultiplier,
    projectileSpeed: weapon.projectileSpeed,
    projectileRadius: weapon.projectileRadius,
    pierceTargets: weapon.pierceTargets,
    tint: weapon.tint,
    visual: weapon.visual
  }));
}

export function getWeaponFireInterval(weaponId: string, baseInterval: number, overdrive = false): number {
  const base = overdrive
    ? 0.095
    : Number.isFinite(baseInterval)
      ? Math.max(0.08, baseInterval)
      : 0.23;
  return Math.max(0.08, Math.min(2.5, base * getWeaponProfile(weaponId).fireIntervalMultiplier));
}

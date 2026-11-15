export type WeaponId = "photon-pulse" | "prism-laser" | "comet-homing" | "nova-piercer" | "eclipse-lance";

export interface WeaponProfile {
  id: WeaponId;
  name: string;
  shortName: string;
  description: string;
  unlockCost: number;
  damageMultiplier: number;
  fireIntervalMultiplier: number;
  projectileSpeed: number;
  radius: number;
  homing: boolean;
  pierce: number;
  color: number;
}

export const WEAPON_PROFILES: Readonly<Record<WeaponId, WeaponProfile>> = {
  "photon-pulse": {
    id: "photon-pulse", name: "フォトンパルス", shortName: "PULSE",
    description: "扱いやすい標準弾。癖のない連射性能。", unlockCost: 0,
    damageMultiplier: 1, fireIntervalMultiplier: 1, projectileSpeed: 15.5,
    radius: 0.14, homing: false, pierce: 0, color: 0x8cf5ff
  },
  "prism-laser": {
    id: "prism-laser", name: "プリズムレーザー", shortName: "LASER",
    description: "細い光線が敵を貫く。連射は遅いが命中が安定。", unlockCost: 160,
    damageMultiplier: 1.18, fireIntervalMultiplier: 1.42, projectileSpeed: 23,
    radius: 0.24, homing: false, pierce: 0, color: 0xffe58e
  },
  "comet-homing": {
    id: "comet-homing", name: "コメットホーミング", shortName: "HOMING",
    description: "近くの敵へ軌道修正する誘導弾。", unlockCost: 280,
    damageMultiplier: 1.35, fireIntervalMultiplier: 1.62, projectileSpeed: 10.5,
    radius: 0.19, homing: true, pierce: 0, color: 0xffa1e5
  },
  "nova-piercer": {
    id: "nova-piercer", name: "ノヴァピアサー", shortName: "PIERCE",
    description: "敵編隊を抜ける重貫通弾。大型目標にも有効。", unlockCost: 420,
    damageMultiplier: 1.55, fireIntervalMultiplier: 1.72, projectileSpeed: 13.5,
    radius: 0.23, homing: false, pierce: 2, color: 0x9b9dff
  },
  "eclipse-lance": {
    id: "eclipse-lance", name: "エクリプスランス", shortName: "ECLIPSE",
    description: "軌道補正しながら一体を貫く高出力弾。発射間隔は長い。", unlockCost: 680,
    damageMultiplier: 1.72, fireIntervalMultiplier: 1.92, projectileSpeed: 12.2,
    radius: 0.24, homing: true, pierce: 1, color: 0xd5a5ff
  }
};

export const DEFAULT_WEAPON_ID: WeaponId = "photon-pulse";
export const ALL_WEAPON_IDS = Object.freeze(Object.keys(WEAPON_PROFILES) as WeaponId[]);

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

export function normalizeEquippedWeaponIds(values: readonly string[], unlocked: readonly WeaponId[]): [WeaponId, WeaponId] {
  const available = values.filter((value): value is WeaponId => isWeaponId(value) && unlocked.includes(value));
  const first = available[0] ?? DEFAULT_WEAPON_ID;
  const second = available[1] ?? first;
  return [first, second];
}

export function normalizeWeaponSlot(value: number): 0 | 1 {
  return value === 1 ? 1 : 0;
}

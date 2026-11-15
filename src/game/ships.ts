export type ShipId = "Lumen-01" | "Aqua-Comet" | "Rose-Bastion" | "Astra-Arc";
export type ShipVisual = "balanced" | "speed" | "heavy" | "arc";

export interface ShipProfile {
  id: ShipId;
  name: string;
  className: string;
  description: string;
  unlockCost: number;
  attackMultiplier: number;
  fireIntervalMultiplier: number;
  movementMultiplier: number;
  hullBonus: number;
  shieldRechargeMultiplier: number;
  visual: ShipVisual;
}

export const SHIP_PROFILES: Readonly<Record<ShipId, ShipProfile>> = {
  "Lumen-01": {
    id: "Lumen-01",
    name: "ルーメン",
    className: "標準型 / BALANCED",
    description: "攻守と機動力のバランスに優れた初期機体",
    unlockCost: 0,
    attackMultiplier: 1,
    fireIntervalMultiplier: 1,
    movementMultiplier: 1,
    hullBonus: 0,
    shieldRechargeMultiplier: 1,
    visual: "balanced"
  },
  "Aqua-Comet": {
    id: "Aqua-Comet",
    name: "アクア・コメット",
    className: "高速型 / INTERCEPTOR",
    description: "移動と連射に特化。敵弾を避けて手数で攻める",
    unlockCost: 350,
    attackMultiplier: 0.88,
    fireIntervalMultiplier: 0.78,
    movementMultiplier: 1.24,
    hullBonus: 0,
    shieldRechargeMultiplier: 0.88,
    visual: "speed"
  },
  "Rose-Bastion": {
    id: "Rose-Bastion",
    name: "ローズ・バスティオン",
    className: "重装型 / HEAVY",
    description: "装甲と一撃の威力を重視。機動力は控えめ",
    unlockCost: 750,
    attackMultiplier: 1.32,
    fireIntervalMultiplier: 1.16,
    movementMultiplier: 0.8,
    hullBonus: 2,
    shieldRechargeMultiplier: 1.3,
    visual: "heavy"
  },
  "Astra-Arc": {
    id: "Astra-Arc",
    name: "アストラ・アーク",
    className: "共鳴型 / RESONATOR",
    description: "弱点狙撃と必殺技の回転を重視。耐久は控えめ",
    unlockCost: 980,
    attackMultiplier: 1.12,
    fireIntervalMultiplier: 1.08,
    movementMultiplier: 1.02,
    hullBonus: 0,
    shieldRechargeMultiplier: 0.92,
    visual: "arc"
  }
};

export const DEFAULT_SHIP_ID: ShipId = "Lumen-01";
export const ALL_SHIP_IDS = Object.freeze(Object.keys(SHIP_PROFILES) as ShipId[]);

export function isShipId(value: string): value is ShipId {
  return Object.prototype.hasOwnProperty.call(SHIP_PROFILES, value);
}

export function getShipProfile(value: string): ShipProfile {
  return SHIP_PROFILES[isShipId(value) ? value : DEFAULT_SHIP_ID];
}

export function normalizeUnlockedShipIds(values: readonly string[]): ShipId[] {
  const valid = ALL_SHIP_IDS.filter((id) => values.includes(id));
  return valid.includes(DEFAULT_SHIP_ID) ? valid : [DEFAULT_SHIP_ID, ...valid];
}

export function normalizeSelectedShipId(value: string, unlocked: readonly ShipId[]): ShipId {
  return isShipId(value) && unlocked.includes(value) ? value : DEFAULT_SHIP_ID;
}

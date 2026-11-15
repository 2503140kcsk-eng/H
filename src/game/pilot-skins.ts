import type { PilotId } from "./pilots";

export type PilotSkinId = "standard" | "nebula-veil";

export interface PilotSkinProfile {
  id: PilotSkinId;
  name: string;
  description: string;
  unlockCost: number;
  uniformColor: number;
  trimColor: number;
  accessoryColor: number;
}

export const PILOT_SKINS: Readonly<Record<PilotSkinId, PilotSkinProfile>> = {
  standard: {
    id: "standard",
    name: "フライトスーツ",
    description: "パイロット固有のカラーを活かした標準衣装",
    unlockCost: 0,
    uniformColor: -1,
    trimColor: 0xe9f3ff,
    accessoryColor: 0xe9f3ff
  },
  "nebula-veil": {
    id: "nebula-veil",
    name: "ネビュラ・ヴェール",
    description: "深い宙色の装甲と星雲色のラインをまとった限定衣装",
    unlockCost: 540,
    uniformColor: 0x39456f,
    trimColor: 0x8ef2e7,
    accessoryColor: 0xd8a8ff
  }
};

export const ALL_PILOT_SKIN_IDS = Object.freeze(Object.keys(PILOT_SKINS) as PilotSkinId[]);

export function isPilotSkinId(value: string): value is PilotSkinId {
  return Object.prototype.hasOwnProperty.call(PILOT_SKINS, value);
}

export function getPilotSkinProfile(value: string): PilotSkinProfile {
  return PILOT_SKINS[isPilotSkinId(value) ? value : "standard"];
}

export function normalizeUnlockedPilotSkinIds(values: readonly string[]): PilotSkinId[] {
  const valid = ALL_PILOT_SKIN_IDS.filter((id) => values.includes(id));
  return valid.includes("standard") ? valid : ["standard", ...valid];
}

export function normalizeSelectedPilotSkinId(value: string, unlocked: readonly PilotSkinId[]): PilotSkinId {
  return isPilotSkinId(value) && unlocked.includes(value) ? value : "standard";
}

export function getPilotSkinAccent(pilotId: PilotId, skinId: PilotSkinId): number {
  if (skinId === "standard") {
    return pilotId === "noa-celeste" ? 0x74e7ff
      : pilotId === "rin-vega" ? 0xff82b7 : 0xffa4d8;
  }
  return 0x8ef2e7;
}

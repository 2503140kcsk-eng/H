export type PickupKind =
  | "shard"
  | "repair"
  | "overdrive"
  | "multishot"
  | "shield"
  | "speed"
  | "special";

export function selectPickupKind(roll: number): PickupKind {
  const value = Number.isFinite(roll) ? Math.max(0, Math.min(0.999999999, roll)) : 0;
  if (value < 0.34) return "shard";
  if (value < 0.48) return "repair";
  if (value < 0.64) return "overdrive";
  if (value < 0.76) return "multishot";
  if (value < 0.88) return "shield";
  if (value < 0.94) return "speed";
  return "special";
}

export const PICKUP_EFFECTS = Object.freeze({
  overdriveSeconds: 7,
  multishotSeconds: 9,
  speedSeconds: 8,
  shieldRestore: 35,
  specialRestore: 35,
  shardReward: 4
});

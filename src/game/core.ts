import { normalizeSelectedPilotId, normalizeUnlockedPilotIds } from "./pilots";
import { normalizeSelectedShipId, normalizeUnlockedShipIds } from "./ships";
import { z } from "zod";

export interface SaveData {
  version: 1;
  shards: number;
  upgrades: { attack: number; hull: number };
  bestScores: Record<string, number>;
  settings: { sensitivity: number; volume: number };
  totalRuns: number;
  unlockedShips: string[];
  selectedShip: string;
  unlockedPilots: string[];
  selectedPilot: string;
  pilotProgress: Record<string, { level: number; xp: number }>;
  pilotLevel: number;
  pilotXp: number;
}

const DEFAULT_SAVE: SaveData = {
  version: 1,
  shards: 0,
  upgrades: { attack: 0, hull: 0 },
  bestScores: {},
  settings: { sensitivity: 1, volume: 0.65 },
  totalRuns: 0,
  unlockedShips: ["Lumen-01"],
  selectedShip: "Lumen-01",
  unlockedPilots: ["lumi-asteria"],
  selectedPilot: "lumi-asteria",
  pilotProgress: { "lumi-asteria": { level: 1, xp: 0 } },
  pilotLevel: 1,
  pilotXp: 0
};

const SaveSchema = z.object({
  version: z.literal(1).catch(1),
  shards: z.number().int().min(0).max(100_000_000).catch(0),
  upgrades: z.object({
    attack: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).catch(0),
    hull: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).catch(0)
  }).catch({ attack: 0, hull: 0 }),
  bestScores: z.record(z.string(), z.number().int().min(0).max(1_000_000_000_000)).catch({}),
  settings: z.object({
    sensitivity: z.number().min(0.35).max(2.5).catch(1),
    volume: z.number().min(0).max(1).catch(0.65)
  }).catch({ sensitivity: 1, volume: 0.65 }),
  totalRuns: z.number().int().min(0).max(1_000_000).catch(0),
  unlockedShips: z.array(z.string().min(1).max(48)).max(16).catch(["Lumen-01"]),
  selectedShip: z.string().min(1).max(48).catch("Lumen-01"),
  unlockedPilots: z.array(z.string().min(1).max(48)).max(12).catch(["lumi-asteria"]),
  selectedPilot: z.string().min(1).max(48).catch("lumi-asteria"),
  pilotProgress: z.record(
    z.string().min(1).max(48),
    z.object({
      level: z.number().int().min(1).max(100),
      xp: z.number().int().min(0).max(1_000_000_000)
    }).strict()
  ).catch({}),
  pilotLevel: z.number().int().min(1).max(100).catch(1),
  pilotXp: z.number().int().min(0).max(1_000_000_000).catch(0)
});

const BackupPayloadSchema = z.object({
  version: z.literal(1),
  shards: z.number().int().min(0).max(100_000_000),
  upgrades: z.object({
    attack: z.number().int().min(0).max(20),
    hull: z.number().int().min(0).max(20)
  }).strict(),
  bestScores: z.record(z.string().min(1).max(48), z.number().int().min(0).max(1_000_000_000_000)),
  settings: z.object({
    sensitivity: z.number().min(0.35).max(2.5),
    volume: z.number().min(0).max(1)
  }).strict(),
  totalRuns: z.number().int().min(0).max(1_000_000),
  unlockedShips: z.array(z.string().min(1).max(48)).min(1).max(16),
  selectedShip: z.string().min(1).max(48),
  unlockedPilots: z.array(z.string().min(1).max(48)).min(1).max(12).optional().default(["lumi-asteria"]),
  selectedPilot: z.string().min(1).max(48).optional().default("lumi-asteria"),
  pilotProgress: z.record(
    z.string().min(1).max(48),
    z.object({
      level: z.number().int().min(1).max(100),
      xp: z.number().int().min(0).max(1_000_000_000)
    }).strict()
  ).optional().default({}),
  pilotLevel: z.number().int().min(1).max(100),
  pilotXp: z.number().int().min(0).max(1_000_000_000)
}).strict();

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

export function resolveDamage(hp: number, damage: number): { hp: number; destroyed: boolean } {
  const safeHp = Number.isFinite(hp) ? Math.max(0, hp) : 0;
  const safeDamage = Number.isFinite(damage) ? Math.max(0, damage) : 0;
  const remaining = Math.max(0, safeHp - safeDamage);
  return { hp: remaining, destroyed: remaining <= 0 };
}

export function upgradeCost(baseCost: number, level: number): number {
  if (!Number.isSafeInteger(baseCost) || baseCost < 0) {
    throw new RangeError("baseCost must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(level) || level < 0 || level > 50) {
    throw new RangeError("level must be an integer between 0 and 50");
  }
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(baseCost * Math.pow(1.55, level)));
}

export function createDefaultSave(): SaveData {
  return structuredClone(DEFAULT_SAVE);
}

export function sanitizeSaveData(value: unknown): SaveData {
  const parsed = SaveSchema.safeParse(value);
  if (!parsed.success) return createDefaultSave();

  const data = parsed.data;
  const ships = normalizeUnlockedShipIds(data.unlockedShips);
  const selectedShip = normalizeSelectedShipId(data.selectedShip, ships);
  const pilots = normalizeUnlockedPilotIds(data.unlockedPilots);
  const selectedPilot = normalizeSelectedPilotId(data.selectedPilot, pilots);
  const pilotProgress: Record<string, { level: number; xp: number }> = {};
  for (const id of pilots) {
    const stored = data.pilotProgress[id];
    pilotProgress[id] = stored
      ? {
          level: clamp(Math.floor(stored.level), 1, 100),
          xp: clamp(Math.floor(stored.xp), 0, 1_000_000_000)
        }
      : id === selectedPilot
        ? {
            level: clamp(data.pilotLevel, 1, 100),
            xp: clamp(data.pilotXp, 0, 1_000_000_000)
          }
        : { level: 1, xp: 0 };
  }
  const activePilotProgress = pilotProgress[selectedPilot] ?? { level: 1, xp: 0 };

  return {
    ...data,
    shards: clamp(Math.floor(data.shards), 0, 100_000_000),
    upgrades: {
      attack: clamp(data.upgrades.attack, 0, 20),
      hull: clamp(data.upgrades.hull, 0, 20)
    },
    bestScores: Object.fromEntries(
      Object.entries(data.bestScores).slice(0, 30).map(([key, score]) => [
        key.slice(0, 48),
        clamp(Math.floor(score), 0, 1_000_000_000_000)
      ])
    ),
    settings: {
      sensitivity: clamp(data.settings.sensitivity, 0.35, 2.5),
      volume: clamp(data.settings.volume, 0, 1)
    },
    unlockedShips: ships,
    selectedShip,
    unlockedPilots: pilots,
    selectedPilot,
    pilotProgress,
    totalRuns: clamp(data.totalRuns, 0, 1_000_000),
    pilotLevel: activePilotProgress.level,
    pilotXp: activePilotProgress.xp
  };
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().map((key) =>
      JSON.stringify(key) + ":" + canonicalize(record[key])
    ).join(",") + "}";
  }
  return JSON.stringify(value);
}

// FNV-1a detects accidental corruption; it is not a cryptographic signature.
function checksum(value: unknown): string {
  const input = canonicalize(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createBackup(value: unknown): string {
  const payload = sanitizeSaveData(value);
  return JSON.stringify({
    format: "starlight-wing-save",
    version: 1,
    checksum: checksum(payload),
    payload
  });
}

export function verifyBackup(serialized: string): SaveData | null {
  if (typeof serialized !== "string" || serialized.length > 1_000_000) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (parsed === null || typeof parsed !== "object") return null;
    const envelope = parsed as Record<string, unknown>;
    if (envelope.format !== "starlight-wing-save" || envelope.version !== 1) return null;
    if (typeof envelope.checksum !== "string" || !/^[0-9a-f]{8}$/.test(envelope.checksum)) return null;
    if (checksum(envelope.payload) !== envelope.checksum) return null;
    const validated = BackupPayloadSchema.safeParse(envelope.payload);
    if (!validated.success) return null;
    return sanitizeSaveData(validated.data);
  } catch {
    return null;
  }
}

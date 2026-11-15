import { normalizeAchievementIds } from "./achievements";
import { normalizeBossCollectionIds, normalizeCompletedPlanetIds, normalizeSelectedPlanetId, PLANET_ORDER, isPlanetId, type PlanetId } from "./campaign";
import { isPilotId, normalizeSelectedPilotId, normalizeUnlockedPilotIds } from "./pilots";
import { normalizeEquippedWeaponIds, normalizeUnlockedWeaponIds, normalizeWeaponSlot } from "./weapons";
import { normalizeSelectedShipId, normalizeUnlockedShipIds } from "./ships";
import { normalizePilotSkills, normalizeSkillTreeInput } from "./pilot-skills";
import { normalizeStoryChoices, isStoryDecisionChoice, STORY_DECISION_ID, type StoryChoiceId } from "./narrative";
import { normalizeSelectedPilotSkinId, normalizeUnlockedPilotSkinIds } from "./pilot-skins";
import { z } from "zod";

export interface ChapterProgressSave {
  chapterId: PlanetId;
  attempts: number;
  clears: number;
  bestScore: number;
  lastPlayedAt: number;
}

export interface CampaignDecisionSave {
  pilotId: string;
  chapterId: PlanetId;
  decisionId: string;
  choiceId: string;
  selectedAt: number;
}

export interface CampaignRouteProgressSave {
  pilotId: string;
  chapterId: PlanetId;
  routeId: StoryChoiceId;
  attempts: number;
  clears: number;
  bestScore: number;
  lastPlayedAt: number;
}

export interface CampaignLastReplaySave {
  pilotId: string;
  chapterId: PlanetId;
  routeId: StoryChoiceId | null;
  outcome: "clear" | "gameover";
  attemptNumber: number;
  recordedAt: number;
}

export interface CampaignSave {
  chapterProgress: ChapterProgressSave[];
  decisions: CampaignDecisionSave[];
  routeProgress: CampaignRouteProgressSave[];
  unlockedSecretRouteIds: string[];
  unlockedEndingIds: string[];
  viewedEndingIds: string[];
  lastReplay: CampaignLastReplaySave | null;
}

export interface SaveData {
  version: 2;
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
  pilotSkills: Record<string, string[]>;
  storyChoices: Record<string, string>;
  storyFlags: string[];
  unlockedPilotSkins: string[];
  selectedPilotSkin: string;
  pilotLevel: number;
  pilotXp: number;
  unlockedWeapons: string[];
  equippedWeapons: string[];
  activeWeaponSlot: 0 | 1;
  completedPlanets: string[];
  selectedPlanet: string;
  achievements: string[];
  bossCollection: string[];
  highScores: Array<{ score: number; mode: "story" | "stage" | "endless"; pilotId: string; planetId: string; achievedAt: number }>;
  campaign: CampaignSave;
}

export interface CampaignRunResultInput {
  pilotId: string;
  chapterId: string;
  routeId: string | null;
  outcome: "clear" | "gameover";
  score: number;
  recordedAt: number;
}

const DEFAULT_CAMPAIGN: CampaignSave = {
  chapterProgress: PLANET_ORDER.map((chapterId) => ({
    chapterId, attempts: 0, clears: 0, bestScore: 0, lastPlayedAt: 0
  })),
  decisions: [],
  routeProgress: [],
  unlockedSecretRouteIds: [],
  unlockedEndingIds: [],
  viewedEndingIds: [],
  lastReplay: null
};

const DEFAULT_SAVE: SaveData = {
  version: 2,
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
  pilotSkills: { "lumi-asteria": [] },
  storyChoices: {},
  storyFlags: [],
  unlockedPilotSkins: ["standard"],
  selectedPilotSkin: "standard",
  pilotLevel: 1,
  pilotXp: 0,
  unlockedWeapons: ["photon-pulse"],
  equippedWeapons: ["photon-pulse", "photon-pulse"],
  activeWeaponSlot: 0,
  completedPlanets: [],
  selectedPlanet: "aurora-prime",
  achievements: [],
  bossCollection: [],
  highScores: [],
  campaign: structuredClone(DEFAULT_CAMPAIGN)
};

const SECRET_ROUTE_IDS = ["celestial-echo"] as const;
const ENDING_IDS: readonly string[] = [];
const MAX_SAVE_TIMESTAMP = 9_999_999_999_999;

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
  pilotSkills: z.record(z.string().min(1).max(48), z.array(z.string().min(1).max(48)).max(12)).catch({}),
  storyChoices: z.record(z.string().min(1).max(80), z.string().min(1).max(48)).catch({}),
  storyFlags: z.array(z.string().min(1).max(48)).max(8).catch([]),
  unlockedPilotSkins: z.array(z.string().min(1).max(48)).max(8).catch(["standard"]),
  selectedPilotSkin: z.string().min(1).max(48).catch("standard"),
  pilotLevel: z.number().int().min(1).max(100).catch(1),
  pilotXp: z.number().int().min(0).max(1_000_000_000).catch(0),
  unlockedWeapons: z.array(z.string().min(1).max(48)).max(12).catch(["photon-pulse"]),
  equippedWeapons: z.array(z.string().min(1).max(48)).max(2).catch(["photon-pulse"]),
  activeWeaponSlot: z.union([z.literal(0), z.literal(1)]).catch(0),
  completedPlanets: z.array(z.string().min(1).max(48)).max(12).catch([]),
  selectedPlanet: z.string().min(1).max(48).catch("aurora-prime"),
  achievements: z.array(z.string().min(1).max(48)).max(32).catch([]),
  bossCollection: z.array(z.string().min(1).max(48)).max(24).catch([]),
  highScores: z.array(z.object({
    score: z.number().int().min(0).max(1_000_000_000_000),
    mode: z.enum(["story", "stage", "endless"]),
    pilotId: z.string().min(1).max(48),
    planetId: z.string().min(1).max(48),
    achievedAt: z.number().int().min(0).max(9_999_999_999_999)
  }).strict()).max(50).catch([])
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
  pilotSkills: z.record(z.string().min(1).max(48), z.array(z.string().min(1).max(48)).max(12)).optional().default({}),
  storyChoices: z.record(z.string().min(1).max(80), z.string().min(1).max(48)).optional().default({}),
  storyFlags: z.array(z.string().min(1).max(48)).max(8).optional().default([]),
  unlockedPilotSkins: z.array(z.string().min(1).max(48)).max(8).optional().default(["standard"]),
  selectedPilotSkin: z.string().min(1).max(48).optional().default("standard"),
  pilotLevel: z.number().int().min(1).max(100),
  pilotXp: z.number().int().min(0).max(1_000_000_000),
  unlockedWeapons: z.array(z.string().min(1).max(48)).max(12).optional().default(["photon-pulse"]),
  equippedWeapons: z.array(z.string().min(1).max(48)).max(2).optional().default(["photon-pulse"]),
  activeWeaponSlot: z.union([z.literal(0), z.literal(1)]).optional().default(0),
  completedPlanets: z.array(z.string().min(1).max(48)).max(12).optional().default([]),
  selectedPlanet: z.string().min(1).max(48).optional().default("aurora-prime"),
  achievements: z.array(z.string().min(1).max(48)).max(32).optional().default([]),
  bossCollection: z.array(z.string().min(1).max(48)).max(24).optional().default([]),
  highScores: z.array(z.object({
    score: z.number().int().min(0).max(1_000_000_000_000),
    mode: z.enum(["story", "stage", "endless"]),
    pilotId: z.string().min(1).max(48),
    planetId: z.string().min(1).max(48),
    achievedAt: z.number().int().min(0).max(9_999_999_999_999)
  }).strict()).max(50).optional().default([])
}).strict();

const ChapterProgressSchema = z.object({
  chapterId: z.string().min(1).max(48),
  attempts: z.number().int().min(0).max(1_000_000),
  clears: z.number().int().min(0).max(1_000_000),
  bestScore: z.number().int().min(0).max(1_000_000_000_000),
  lastPlayedAt: z.number().int().min(0).max(MAX_SAVE_TIMESTAMP)
}).strict();

const CampaignDecisionSchema = z.object({
  pilotId: z.string().min(1).max(48),
  chapterId: z.string().min(1).max(48),
  decisionId: z.string().min(1).max(48),
  choiceId: z.string().min(1).max(48),
  selectedAt: z.number().int().min(0).max(MAX_SAVE_TIMESTAMP)
}).strict();

const CampaignRouteProgressSchema = z.object({
  pilotId: z.string().min(1).max(48),
  chapterId: z.string().min(1).max(48),
  routeId: z.string().min(1).max(48),
  attempts: z.number().int().min(0).max(1_000_000),
  clears: z.number().int().min(0).max(1_000_000),
  bestScore: z.number().int().min(0).max(1_000_000_000_000),
  lastPlayedAt: z.number().int().min(0).max(MAX_SAVE_TIMESTAMP)
}).strict();

const CampaignLastReplaySchema = z.object({
  pilotId: z.string().min(1).max(48),
  chapterId: z.string().min(1).max(48),
  routeId: z.string().min(1).max(48).nullable(),
  outcome: z.enum(["clear", "gameover"]),
  attemptNumber: z.number().int().min(1).max(1_000_000),
  recordedAt: z.number().int().min(0).max(MAX_SAVE_TIMESTAMP)
}).strict();

const CampaignSchema = z.object({
  chapterProgress: z.array(ChapterProgressSchema).max(32),
  decisions: z.array(CampaignDecisionSchema).max(512),
  routeProgress: z.array(CampaignRouteProgressSchema).max(256),
  unlockedSecretRouteIds: z.array(z.string().min(1).max(48)).max(32),
  unlockedEndingIds: z.array(z.string().min(1).max(48)).max(64),
  viewedEndingIds: z.array(z.string().min(1).max(48)).max(64),
  lastReplay: CampaignLastReplaySchema.nullable()
}).strict();

const SaveV2Schema = SaveSchema.extend({
  version: z.literal(2).catch(2),
  campaign: CampaignSchema.catch(structuredClone(DEFAULT_CAMPAIGN))
});

const BackupV2PayloadSchema = BackupPayloadSchema.extend({
  version: z.literal(2),
  campaign: CampaignSchema
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

function safeInteger(value: number, max: number): number {
  return Number.isFinite(value) ? clamp(Math.floor(value), 0, max) : 0;
}

function createLegacyCampaign(
  legacy: z.infer<typeof SaveSchema>,
  completedPlanets: PlanetId[],
  storyChoices: Record<string, string>,
  storyFlags: string[]
): CampaignSave {
  const completed = new Set(completedPlanets);
  const chapterProgress = PLANET_ORDER.map((chapterId) => {
    const cleared = completed.has(chapterId);
    return {
      chapterId,
      attempts: cleared ? 1 : 0,
      clears: cleared ? 1 : 0,
      bestScore: 0,
      lastPlayedAt: 0
    };
  });
  const decisions: CampaignDecisionSave[] = [];
  for (const [key, choiceId] of Object.entries(storyChoices)) {
    const separator = key.indexOf(":");
    if (separator <= 0) continue;
    const pilotId = key.slice(0, separator);
    const chapterId = key.slice(separator + 1);
    if (!isPilotId(pilotId) || !isPlanetId(chapterId) || !isStoryDecisionChoice(STORY_DECISION_ID, choiceId)) continue;
    decisions.push({
      pilotId, chapterId, decisionId: STORY_DECISION_ID, choiceId, selectedAt: 0
    });
  }

  return {
    chapterProgress,
    decisions,
    // V1 has no route-run history. A saved choice is not proof that this route was cleared.
    routeProgress: [],
    unlockedSecretRouteIds: storyFlags.includes("celestial-echo") ? ["celestial-echo"] : [],
    unlockedEndingIds: [],
    viewedEndingIds: [],
    lastReplay: null
  };
}

function normalizeCampaignSave(
  source: CampaignSave,
  storyChoices: Record<string, string>,
  storyFlags: string[]
): CampaignSave {
  const chapterById = new Map<string, ChapterProgressSave>();
  for (const record of source.chapterProgress) {
    if (!isPlanetId(record.chapterId) || chapterById.has(record.chapterId)) continue;
    chapterById.set(record.chapterId, {
      chapterId: record.chapterId,
      attempts: safeInteger(record.attempts, 1_000_000),
      clears: safeInteger(record.clears, 1_000_000),
      bestScore: safeInteger(record.bestScore, 1_000_000_000_000),
      lastPlayedAt: safeInteger(record.lastPlayedAt, MAX_SAVE_TIMESTAMP)
    });
  }
  const chapterProgress = PLANET_ORDER.map((chapterId) => chapterById.get(chapterId) ?? ({
    chapterId, attempts: 0, clears: 0, bestScore: 0, lastPlayedAt: 0
  }));

  const decisionByKey = new Map<string, CampaignDecisionSave>();
  for (const record of source.decisions) {
    if (!isPilotId(record.pilotId) || !isPlanetId(record.chapterId) ||
        !isStoryDecisionChoice(record.decisionId, record.choiceId)) continue;
    const key = record.pilotId + ":" + record.chapterId + ":" + record.decisionId;
    if (decisionByKey.has(key)) continue;
    decisionByKey.set(key, {
      pilotId: record.pilotId,
      chapterId: record.chapterId,
      decisionId: record.decisionId,
      choiceId: record.choiceId,
      selectedAt: safeInteger(record.selectedAt, MAX_SAVE_TIMESTAMP)
    });
  }
  for (const [key, choiceId] of Object.entries(storyChoices)) {
    const separator = key.indexOf(":");
    if (separator <= 0) continue;
    const pilotId = key.slice(0, separator);
    const chapterId = key.slice(separator + 1);
    if (!isPilotId(pilotId) || !isPlanetId(chapterId) ||
        !isStoryDecisionChoice(STORY_DECISION_ID, choiceId)) continue;
    const decisionKey = pilotId + ":" + chapterId + ":" + STORY_DECISION_ID;
    const previous = decisionByKey.get(decisionKey);
    decisionByKey.set(decisionKey, {
      pilotId,
      chapterId,
      decisionId: STORY_DECISION_ID,
      choiceId,
      selectedAt: previous?.selectedAt ?? 0
    });
  }

  const routeByKey = new Map<string, CampaignRouteProgressSave>();
  for (const record of source.routeProgress) {
    if (!isPilotId(record.pilotId) || !isPlanetId(record.chapterId) ||
        !isStoryDecisionChoice(STORY_DECISION_ID, record.routeId)) continue;
    const key = record.pilotId + ":" + record.chapterId + ":" + record.routeId;
    if (routeByKey.has(key)) continue;
    routeByKey.set(key, {
      pilotId: record.pilotId,
      chapterId: record.chapterId,
      routeId: record.routeId as StoryChoiceId,
      attempts: safeInteger(record.attempts, 1_000_000),
      clears: safeInteger(record.clears, 1_000_000),
      bestScore: safeInteger(record.bestScore, 1_000_000_000_000),
      lastPlayedAt: safeInteger(record.lastPlayedAt, MAX_SAVE_TIMESTAMP)
    });
  }

  const unlockedSecretRouteIds = SECRET_ROUTE_IDS.filter((id) =>
    source.unlockedSecretRouteIds.includes(id) || (id === "celestial-echo" && storyFlags.includes(id))
  );
  const unlockedEndingIds = ENDING_IDS.filter((id) => source.unlockedEndingIds.includes(id));
  const viewedEndingIds = unlockedEndingIds.filter((id) => source.viewedEndingIds.includes(id));

  let lastReplay: CampaignLastReplaySave | null = null;
  const candidate = source.lastReplay;
  if (candidate && isPilotId(candidate.pilotId) && isPlanetId(candidate.chapterId) &&
      (candidate.routeId === null || isStoryDecisionChoice(STORY_DECISION_ID, candidate.routeId)) &&
      (candidate.outcome === "clear" || candidate.outcome === "gameover")) {
    lastReplay = {
      pilotId: candidate.pilotId,
      chapterId: candidate.chapterId,
      routeId: candidate.routeId as StoryChoiceId | null,
      outcome: candidate.outcome,
      attemptNumber: Math.max(1, safeInteger(candidate.attemptNumber, 1_000_000)),
      recordedAt: safeInteger(candidate.recordedAt, MAX_SAVE_TIMESTAMP)
    };
  }

  return {
    chapterProgress,
    decisions: [...decisionByKey.values()].slice(0, 512),
    routeProgress: [...routeByKey.values()].slice(0, 256),
    unlockedSecretRouteIds,
    unlockedEndingIds,
    viewedEndingIds,
    lastReplay
  };
}

function normalizeParsedSave(data: z.infer<typeof SaveV2Schema>): SaveData {
  const ships = normalizeUnlockedShipIds(data.unlockedShips);
  const selectedShip = normalizeSelectedShipId(data.selectedShip, ships);
  const pilots = normalizeUnlockedPilotIds(data.unlockedPilots);
  const selectedPilot = normalizeSelectedPilotId(data.selectedPilot, pilots);
  const unlockedWeapons = normalizeUnlockedWeaponIds(data.unlockedWeapons);
  const equippedWeapons = normalizeEquippedWeaponIds(data.equippedWeapons, unlockedWeapons);
  const completedPlanets = normalizeCompletedPlanetIds(data.completedPlanets);
  const selectedPlanet = normalizeSelectedPlanetId(data.selectedPlanet, completedPlanets);
  const achievements = normalizeAchievementIds(data.achievements);
  const bossCollection = normalizeBossCollectionIds(data.bossCollection);
  const highScores = data.highScores
    .filter((entry) => isPilotId(entry.pilotId) && isPlanetId(entry.planetId))
    .map((entry) => ({ ...entry, score: clamp(Math.floor(entry.score), 0, 1_000_000_000_000) }))
    .sort((left, right) => right.score - left.score || right.achievedAt - left.achievedAt)
    .slice(0, 10);
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
  const pilotSkills = normalizePilotSkills(normalizeSkillTreeInput(data.pilotSkills), pilots, pilotProgress);
  const storyChoices = normalizeStoryChoices(data.storyChoices);
  const storyFlags = data.storyFlags.includes("celestial-echo") ? ["celestial-echo"] : [];
  const unlockedPilotSkins = normalizeUnlockedPilotSkinIds(data.unlockedPilotSkins);
  const selectedPilotSkin = normalizeSelectedPilotSkinId(data.selectedPilotSkin, unlockedPilotSkins);
  const activePilotProgress = pilotProgress[selectedPilot] ?? { level: 1, xp: 0 };
  const campaign = normalizeCampaignSave(data.campaign, storyChoices, storyFlags);

  return {
    ...data,
    version: 2,
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
    pilotSkills,
    storyChoices,
    storyFlags,
    unlockedPilotSkins,
    selectedPilotSkin,
    totalRuns: clamp(data.totalRuns, 0, 1_000_000),
    pilotLevel: activePilotProgress.level,
    pilotXp: activePilotProgress.xp,
    unlockedWeapons,
    equippedWeapons,
    activeWeaponSlot: normalizeWeaponSlot(data.activeWeaponSlot),
    completedPlanets,
    selectedPlanet,
    achievements,
    bossCollection,
    highScores,
    campaign
  };
}

export function migrateV1ToV2(value: unknown): SaveData | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) return null;
  const parsed = SaveSchema.safeParse(value);
  if (!parsed.success) return null;

  const legacy = parsed.data;
  const storyChoices = normalizeStoryChoices(legacy.storyChoices);
  const storyFlags = legacy.storyFlags.includes("celestial-echo") ? ["celestial-echo"] : [];
  const completedPlanets = normalizeCompletedPlanetIds(legacy.completedPlanets);
  const campaign = createLegacyCampaign(legacy, completedPlanets, storyChoices, storyFlags);
  const migrated = SaveV2Schema.safeParse({
    ...legacy,
    version: 2,
    storyChoices,
    storyFlags,
    completedPlanets,
    campaign
  });
  return migrated.success ? normalizeParsedSave(migrated.data) : null;
}

export function sanitizeSaveData(value: unknown): SaveData {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return createDefaultSave();
  const version = (value as Record<string, unknown>).version;
  if (version === 1) return migrateV1ToV2(value) ?? createDefaultSave();
  if (version !== 2) return createDefaultSave();
  const parsed = SaveV2Schema.safeParse(value);
  return parsed.success ? normalizeParsedSave(parsed.data) : createDefaultSave();
}

export function recordCampaignRunResult(value: unknown, event: CampaignRunResultInput): SaveData {
  const save = sanitizeSaveData(value);
  if (!isPilotId(event.pilotId) || !isPlanetId(event.chapterId) ||
      (event.routeId !== null && !isStoryDecisionChoice(STORY_DECISION_ID, event.routeId)) ||
      (event.outcome !== "clear" && event.outcome !== "gameover") ||
      !Number.isSafeInteger(event.score) || event.score < 0 ||
      !Number.isSafeInteger(event.recordedAt) || event.recordedAt < 0 ||
      event.recordedAt > MAX_SAVE_TIMESTAMP) return save;

  const score = clamp(event.score, 0, 1_000_000_000_000);
  const existingChapter = save.campaign.chapterProgress.find((item) => item.chapterId === event.chapterId);
  const chapterAttempts = (existingChapter?.attempts ?? 0) + 1;
  const chapterProgress = save.campaign.chapterProgress.map((item) => item.chapterId === event.chapterId
    ? {
        ...item,
        attempts: chapterAttempts,
        clears: item.clears + (event.outcome === "clear" ? 1 : 0),
        bestScore: Math.max(item.bestScore, score),
        lastPlayedAt: event.recordedAt
      }
    : item);

  let routeProgress = save.campaign.routeProgress;
  let attemptNumber = chapterAttempts;
  if (event.routeId !== null) {
    const existingRoute = routeProgress.find((item) =>
      item.pilotId === event.pilotId &&
      item.chapterId === event.chapterId &&
      item.routeId === event.routeId
    );
    attemptNumber = (existingRoute?.attempts ?? 0) + 1;
    const nextRoute: CampaignRouteProgressSave = {
      pilotId: event.pilotId,
      chapterId: event.chapterId,
      routeId: event.routeId,
      attempts: attemptNumber,
      clears: (existingRoute?.clears ?? 0) + (event.outcome === "clear" ? 1 : 0),
      bestScore: Math.max(existingRoute?.bestScore ?? 0, score),
      lastPlayedAt: event.recordedAt
    };
    routeProgress = existingRoute
      ? routeProgress.map((item) =>
          item.pilotId === event.pilotId && item.chapterId === event.chapterId && item.routeId === event.routeId
            ? nextRoute : item
        )
      : [...routeProgress, nextRoute];
  }

  const completedPlanets = event.outcome === "clear"
    ? normalizeCompletedPlanetIds([...save.completedPlanets, event.chapterId])
    : save.completedPlanets;

  return sanitizeSaveData({
    ...save,
    completedPlanets,
    campaign: {
      ...save.campaign,
      chapterProgress,
      routeProgress,
      lastReplay: {
        pilotId: event.pilotId,
        chapterId: event.chapterId,
        routeId: event.routeId,
        outcome: event.outcome,
        attemptNumber,
        recordedAt: event.recordedAt
      }
    }
  });
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
    version: 2,
    checksum: checksum(payload),
    payload
  });
}

export function verifyBackup(serialized: string): SaveData | null {
  if (typeof serialized !== "string" || serialized.length > 1_000_000) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const envelope = parsed as Record<string, unknown>;
    if (envelope.format !== "starlight-wing-save" ||
        (envelope.version !== 1 && envelope.version !== 2)) return null;
    if (typeof envelope.checksum !== "string" || !/^[0-9a-f]{8}$/.test(envelope.checksum)) return null;
    if (checksum(envelope.payload) !== envelope.checksum) return null;

    if (envelope.version === 1) {
      const validated = BackupPayloadSchema.safeParse(envelope.payload);
      return validated.success ? migrateV1ToV2(validated.data) : null;
    }
    const validated = BackupV2PayloadSchema.safeParse(envelope.payload);
    return validated.success ? sanitizeSaveData(validated.data) : null;
  } catch {
    return null;
  }
}

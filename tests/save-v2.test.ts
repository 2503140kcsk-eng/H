import { describe, expect, it } from "vitest";
import {
  createBackup,
  createDefaultSave,
  migrateV1ToV2,
  recordCampaignRunResult,
  verifyBackup
} from "../src/game/core";

const LEGACY_V1_SAVE = {
  version: 1,
  shards: 4321,
  upgrades: { attack: 2, hull: 1 },
  bestScores: { story: 9876 },
  settings: { sensitivity: 1.2, volume: 0.4 },
  totalRuns: 7,
  unlockedShips: ["Lumen-01", "Aqua-Comet"],
  selectedShip: "Aqua-Comet",
  unlockedPilots: ["lumi-asteria", "noa-celeste"],
  selectedPilot: "lumi-asteria",
  pilotProgress: {
    "lumi-asteria": { level: 8, xp: 120 },
    "noa-celeste": { level: 3, xp: 25 }
  },
  pilotSkills: { "lumi-asteria": ["lumi-stellar-focus"] },
  storyChoices: {
    "lumi-asteria:aurora-prime": "follow-signal",
    "lumi-asteria:pyra-reach": "protect-crew"
  },
  storyFlags: ["celestial-echo"],
  unlockedPilotSkins: ["standard", "nebula-veil"],
  selectedPilotSkin: "nebula-veil",
  pilotLevel: 8,
  pilotXp: 120,
  unlockedWeapons: ["photon-pulse", "prism-laser"],
  equippedWeapons: ["prism-laser", "photon-pulse"],
  activeWeaponSlot: 0,
  completedPlanets: ["aurora-prime"],
  selectedPlanet: "pyra-reach",
  achievements: ["first-flight"],
  bossCollection: ["nebula-empress"],
  highScores: [{
    score: 9876,
    mode: "story",
    pilotId: "lumi-asteria",
    planetId: "aurora-prime",
    achievedAt: 1_800_000_000_000
  }]
};

const LEGACY_V1_BACKUP = JSON.stringify({
  format: "starlight-wing-save",
  version: 1,
  checksum: "b55a0f90",
  payload: {
    version: 1, shards: 120, upgrades: { attack: 2, hull: 1 },
    bestScores: { story: 3400 },
    settings: { sensitivity: 1.15, volume: 0.7 },
    totalRuns: 3, unlockedShips: ["Lumen-01", "Aqua-Comet"],
    selectedShip: "Aqua-Comet", pilotLevel: 4, pilotXp: 25
  }
});

describe("save format v2", () => {
  it("migrates a v1 save without losing existing progression", () => {
    const migrated = migrateV1ToV2(LEGACY_V1_SAVE);

    expect(migrated).not.toBeNull();
    expect(migrated?.version).toBe(2);
    expect(migrated?.shards).toBe(4321);
    expect(migrated?.selectedShip).toBe("Aqua-Comet");
    expect(migrated?.pilotProgress["lumi-asteria"]).toEqual({ level: 8, xp: 120 });
    expect(migrated?.storyChoices).toEqual(LEGACY_V1_SAVE.storyChoices);
    expect(migrated?.completedPlanets).toEqual(["aurora-prime"]);
    expect(migrated?.campaign.unlockedSecretRouteIds).toContain("celestial-echo");
    expect(migrated?.campaign.decisions).toContainEqual({
      pilotId: "lumi-asteria",
      chapterId: "aurora-prime",
      decisionId: "planet-opening",
      choiceId: "follow-signal",
      selectedAt: 0
    });
    expect(migrated?.campaign.lastReplay).toBeNull();
    // V1 stores choices but not run history; don't invent route-specific clears.
    expect(migrated?.campaign.routeProgress).toEqual([]);
    expect(migrated?.campaign.chapterProgress.find((item) => item.chapterId === "aurora-prime"))
      .toMatchObject({ attempts: 1, clears: 1, bestScore: 0, lastPlayedAt: 0 });
  });

  it("rejects records that are not explicitly version 1 in the v1 migration function", () => {
    expect(migrateV1ToV2({ ...LEGACY_V1_SAVE, version: 2 })).toBeNull();
    expect(migrateV1ToV2({ ...LEGACY_V1_SAVE, version: 99 })).toBeNull();
  });

  it("writes only v2 backups and restores the complete campaign section", () => {
    const save = createDefaultSave();
    const populated = {
      ...save,
      campaign: {
        ...save.campaign,
        decisions: [{
          pilotId: "lumi-asteria",
          chapterId: "aurora-prime",
          decisionId: "planet-opening",
          choiceId: "follow-signal",
          selectedAt: 1_800_000_000_000
        }],
        routeProgress: [{
          pilotId: "lumi-asteria",
          chapterId: "aurora-prime",
          routeId: "follow-signal",
          attempts: 3,
          clears: 2,
          bestScore: 9876,
          lastPlayedAt: 1_800_000_000_000
        }],
        unlockedSecretRouteIds: ["celestial-echo"],
        unlockedEndingIds: [],
        viewedEndingIds: [],
        lastReplay: {
          pilotId: "lumi-asteria",
          chapterId: "aurora-prime",
          routeId: "follow-signal",
          outcome: "clear",
          attemptNumber: 3,
          recordedAt: 1_800_000_000_000
        }
      }
    };

    const serialized = createBackup(populated);
    const envelope = JSON.parse(serialized) as {
      version: number;
      payload: { version: number };
    };
    const restored = verifyBackup(serialized);

    expect(envelope.version).toBe(2);
    expect(envelope.payload.version).toBe(2);
    expect(restored?.campaign.routeProgress).toEqual(populated.campaign.routeProgress);
    expect(restored?.campaign.lastReplay).toEqual(populated.campaign.lastReplay);
    expect(restored?.campaign.unlockedSecretRouteIds).toEqual(["celestial-echo"]);
  });

  it("still verifies the original v1 checksum before migrating its payload", () => {
    const restored = verifyBackup(LEGACY_V1_BACKUP);
    expect(restored?.version).toBe(2);
    expect(restored?.shards).toBe(120);
    expect(restored?.selectedShip).toBe("Aqua-Comet");
    expect(restored?.campaign.lastReplay).toBeNull();
  });

  it("drops unknown chapter, decision, route, secret-route and ending IDs", () => {
    const save = createDefaultSave();
    const sanitized = {
      ...save,
      campaign: {
        ...save.campaign,
        chapterProgress: [
          { chapterId: "forged-chapter", attempts: 99, clears: 99, bestScore: 999, lastPlayedAt: 1 }
        ],
        decisions: [{
          pilotId: "forged-pilot",
          chapterId: "aurora-prime",
          decisionId: "planet-opening",
          choiceId: "follow-signal",
          selectedAt: 1
        }, {
          pilotId: "lumi-asteria",
          chapterId: "aurora-prime",
          decisionId: "forged-decision",
          choiceId: "forged-choice",
          selectedAt: 1
        }],
        routeProgress: [{
          pilotId: "lumi-asteria",
          chapterId: "aurora-prime",
          routeId: "forged-route",
          attempts: 99,
          clears: 99,
          bestScore: 999,
          lastPlayedAt: 1
        }],
        unlockedSecretRouteIds: ["celestial-echo", "forged-secret"],
        unlockedEndingIds: ["forged-ending"],
        viewedEndingIds: ["forged-ending"],
        lastReplay: {
          pilotId: "forged-pilot",
          chapterId: "aurora-prime",
          routeId: "follow-signal",
          outcome: "clear",
          attemptNumber: 99,
          recordedAt: 1
        }
      }
    };

    const serialized = createBackup(sanitized);
    const restored = verifyBackup(serialized);

    expect(restored?.campaign.chapterProgress.map((item) => item.chapterId))
      .toEqual(["aurora-prime", "pyra-reach", "noctis-archive"]);
    expect(restored?.campaign.decisions).toEqual([]);
    expect(restored?.campaign.routeProgress).toEqual([]);
    expect(restored?.campaign.unlockedSecretRouteIds).toEqual(["celestial-echo"]);
    expect(restored?.campaign.unlockedEndingIds).toEqual([]);
    expect(restored?.campaign.viewedEndingIds).toEqual([]);
    expect(restored?.campaign.lastReplay).toBeNull();
  });

  it("keeps separate route histories when a pilot replays a different branch", () => {
    const initial = createDefaultSave();
    const first = recordCampaignRunResult(initial, {
      pilotId: "lumi-asteria",
      chapterId: "aurora-prime",
      routeId: "follow-signal",
      outcome: "clear",
      score: 9876,
      recordedAt: 1_800_000_000_000
    });
    const second = recordCampaignRunResult(first, {
      pilotId: "lumi-asteria",
      chapterId: "aurora-prime",
      routeId: "protect-crew",
      outcome: "gameover",
      score: 1234,
      recordedAt: 1_800_000_100_000
    });

    expect(second.campaign.chapterProgress.find((item) => item.chapterId === "aurora-prime"))
      .toMatchObject({ attempts: 2, clears: 1, bestScore: 9876 });
    expect(second.campaign.routeProgress).toEqual([
      expect.objectContaining({
        routeId: "follow-signal", attempts: 1, clears: 1, bestScore: 9876
      }),
      expect.objectContaining({
        routeId: "protect-crew", attempts: 1, clears: 0, bestScore: 1234
      })
    ]);
    expect(second.campaign.lastReplay).toMatchObject({
      routeId: "protect-crew", outcome: "gameover", attemptNumber: 1
    });
    expect(second.storyChoices).toEqual({});
    expect(second.completedPlanets).toEqual(["aurora-prime"]);
  });
});

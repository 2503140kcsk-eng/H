import { describe, expect, it } from "vitest";
import { sanitizeSaveData, verifyBackup } from "../src/game/core";

const LEGACY_V1_BACKUP = JSON.stringify({
  format: "starlight-wing-save",
  version: 1,
  checksum: "b55a0f90",
  payload: {
    version: 1,
    shards: 120,
    upgrades: { attack: 2, hull: 1 },
    bestScores: { story: 3400 },
    settings: { sensitivity: 1.15, volume: 0.7 },
    totalRuns: 3,
    unlockedShips: ["Lumen-01", "Aqua-Comet"],
    selectedShip: "Aqua-Comet",
    pilotLevel: 4,
    pilotXp: 25
  }
});

describe("save compatibility and damaged-backup regression", () => {
  it("migrates an old local record without pilot and campaign fields while retaining progress", () => {
    const legacyRecord = {
      version: 1,
      shards: 950,
      upgrades: { attack: 3, hull: 2 },
      bestScores: { story: 12000 },
      settings: { sensitivity: 1.2, volume: 0.4 },
      totalRuns: 9,
      unlockedShips: ["Lumen-01", "Aqua-Comet"],
      selectedShip: "Aqua-Comet",
      pilotLevel: 7,
      pilotXp: 84
    };
    const migrated = sanitizeSaveData(legacyRecord);
    expect(migrated.shards).toBe(950);
    expect(migrated.selectedShip).toBe("Aqua-Comet");
    expect(migrated.selectedPilot).toBe("lumi-asteria");
    expect(migrated.pilotProgress["lumi-asteria"]).toEqual({ level: 7, xp: 84 });
    expect(migrated.completedPlanets).toEqual([]);
    expect(migrated.equippedWeapons).toEqual(["photon-pulse", "photon-pulse"]);
  });

  it("imports a historical version-1 backup and fills newer fields with stable defaults", () => {
    const restored = verifyBackup(LEGACY_V1_BACKUP);
    expect(restored).not.toBeNull();
    expect(restored?.shards).toBe(120);
    expect(restored?.selectedShip).toBe("Aqua-Comet");
    expect(restored?.pilotProgress["lumi-asteria"]).toEqual({ level: 4, xp: 25 });
    expect(restored?.selectedPlanet).toBe("aurora-prime");
    expect(restored?.equippedWeapons).toEqual(["photon-pulse", "photon-pulse"]);
  });

  it("rejects a payload whose content changed after its checksum was created", () => {
    const envelope = JSON.parse(LEGACY_V1_BACKUP) as { payload: { shards: number } };
    envelope.payload.shards += 1;
    expect(verifyBackup(JSON.stringify(envelope))).toBeNull();
  });

  it("rejects truncated JSON and an oversized backup without attempting recovery", () => {
    expect(verifyBackup("{")).toBeNull();
    expect(verifyBackup(" ".repeat(1_000_001))).toBeNull();
  });
});

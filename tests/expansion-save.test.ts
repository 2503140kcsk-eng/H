import { describe, expect, it } from "vitest";
import { createBackup, createDefaultSave, sanitizeSaveData, verifyBackup } from "../src/game/core";

const LEGACY_PRE_EXPANSION_BACKUP = JSON.stringify({
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

describe("expanded save data and legacy migration", () => {
  it("adds safe campaign, weapon, achievement, collection and ranking defaults", () => {
    const save = createDefaultSave();
    expect(save.unlockedWeapons).toEqual(["photon-pulse"]);
    expect(save.equippedWeapons).toEqual(["photon-pulse", "photon-pulse"]);
    expect(save.activeWeaponSlot).toBe(0);
    expect(save.completedPlanets).toEqual([]);
    expect(save.selectedPlanet).toBe("aurora-prime");
    expect(save.achievements).toEqual([]);
    expect(save.bossCollection).toEqual([]);
    expect(save.highScores).toEqual([]);
  });

  it("round-trips two weapon slots and local campaign records through backup", () => {
    const save = createDefaultSave();
    save.unlockedWeapons.push("prism-laser", "comet-homing");
    save.equippedWeapons = ["prism-laser", "comet-homing"];
    save.activeWeaponSlot = 1;
    save.completedPlanets.push("aurora-prime");
    save.selectedPlanet = "pyra-reach";
    save.achievements.push("first-flight");
    save.bossCollection.push("nebula-empress");
    save.highScores.push({
      score: 9876, mode: "story", pilotId: "lumi-asteria",
      planetId: "aurora-prime", achievedAt: 1_800_000_000_000
    });
    const restored = verifyBackup(createBackup(save));
    expect(restored?.equippedWeapons).toEqual(["prism-laser", "comet-homing"]);
    expect(restored?.activeWeaponSlot).toBe(1);
    expect(restored?.selectedPlanet).toBe("pyra-reach");
    expect(restored?.completedPlanets).toEqual(["aurora-prime"]);
    expect(restored?.achievements).toContain("first-flight");
    expect(restored?.bossCollection).toContain("nebula-empress");
    expect(restored?.highScores[0]?.score).toBe(9876);
  });

  it("migrates old v1 backup records without requiring newly introduced properties", () => {
    const restored = verifyBackup(LEGACY_PRE_EXPANSION_BACKUP);
    expect(restored).not.toBeNull();
    expect(restored?.shards).toBe(120);
    expect(restored?.selectedShip).toBe("Aqua-Comet");
    expect(restored?.pilotLevel).toBe(4);
    expect(restored?.unlockedWeapons).toEqual(["photon-pulse"]);
    expect(restored?.selectedPlanet).toBe("aurora-prime");
    expect(restored?.highScores).toEqual([]);
  });


  it("round-trips pilot skills, branching story choices and the hidden-route reward", () => {
    const save = createDefaultSave();
    save.pilotProgress["lumi-asteria"] = { level: 6, xp: 90 };
    save.pilotSkills["lumi-asteria"] = ["lumi-stellar-focus", "lumi-orbit-reader"];
    save.storyChoices = {
      "lumi-asteria:aurora-prime": "follow-signal",
      "lumi-asteria:pyra-reach": "follow-signal",
      "lumi-asteria:noctis-archive": "follow-signal"
    };
    save.storyFlags = ["celestial-echo"];
    const restored = verifyBackup(createBackup(save));
    expect(restored?.pilotSkills["lumi-asteria"]).toEqual(["lumi-stellar-focus", "lumi-orbit-reader"]);
    expect(restored?.storyChoices).toEqual(save.storyChoices);
    expect(restored?.storyFlags).toContain("celestial-echo");
  });

  it("drops forged skill nodes and invalid story choice values during save sanitization", () => {
    const save = createDefaultSave();
    const clean = sanitizeSaveData({
      ...save,
      pilotProgress: { "lumi-asteria": { level: 6, xp: 0 } },
      pilotSkills: {
        "lumi-asteria": ["lumi-stellar-focus", "lumi-orbit-reader", "forged-node"],
        "noa-celeste": ["noa-aegis-frame"]
      },
      storyChoices: {
        "lumi-asteria:aurora-prime": "not-a-real-choice",
        "rin-vega:noctis-archive": "protect-crew"
      },
      storyFlags: ["celestial-echo", "forged-flag"]
    });
    expect(clean.pilotSkills["lumi-asteria"]).toEqual(["lumi-stellar-focus", "lumi-orbit-reader"]);
    expect(clean.pilotSkills["noa-celeste"]).toBeUndefined();
    expect(clean.storyChoices).toEqual({ "rin-vega:noctis-archive": "protect-crew" });
    expect(clean.storyFlags).toEqual(["celestial-echo"]);
  });

  it("filters forged profile references in local high scores", () => {
    const save = createDefaultSave();
    const clean = sanitizeSaveData({
      ...save,
      highScores: [
        { score: 100, mode: "story", pilotId: "forged", planetId: "aurora-prime", achievedAt: 10 },
        { score: 220, mode: "story", pilotId: "lumi-asteria", planetId: "pyra-reach", achievedAt: 20 }
      ]
    });
    expect(clean.highScores).toHaveLength(1);
    expect(clean.highScores[0]?.score).toBe(220);
  });
});

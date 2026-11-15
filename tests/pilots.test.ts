import { describe, expect, it } from "vitest";
import { createBackup, createDefaultSave, sanitizeSaveData, verifyBackup } from "../src/game/core";
import {
  getPilotGrowthStats,
  getPilotProfile,
  normalizeSelectedPilotId,
  normalizeUnlockedPilotIds
} from "../src/game/pilots";

const LEGACY_PAYLOAD = {"version":1,"shards":120,"upgrades":{"attack":2,"hull":1},"bestScores":{"story":3400},"settings":{"sensitivity":1.15,"volume":0.7},"totalRuns":3,"unlockedShips":["Lumen-01","Aqua-Comet"],"selectedShip":"Aqua-Comet","pilotLevel":4,"pilotXp":25};
const LEGACY_BACKUP = JSON.stringify({
  format: "starlight-wing-save",
  version: 1,
  checksum: "b55a0f90",
  payload: LEGACY_PAYLOAD
});

describe("pilot roster and backward-compatible save integration", () => {
  it("defines three pilots with differentiated gameplay roles", () => {
    const support = getPilotProfile("noa-celeste");
    const ace = getPilotProfile("rin-vega");
    expect(support.hullBonus).toBeGreaterThan(0);
    expect(support.shieldRechargeMultiplier).toBeGreaterThan(1);
    expect(support.specialMultiplier).toBeGreaterThan(1);
    expect(ace.attackMultiplier).toBeGreaterThan(1);
    expect(ace.movementMultiplier).toBeGreaterThan(1);
    expect(ace.shieldRechargeMultiplier).toBeLessThan(1);
  });

  it("filters unknown and duplicate pilot identifiers and always retains Lumi", () => {
    expect(normalizeUnlockedPilotIds(["rin-vega", "rin-vega", "forged-pilot"])).toEqual([
      "lumi-asteria",
      "rin-vega"
    ]);
  });

  it("does not allow selection of a locked or unknown pilot", () => {
    const unlocked = normalizeUnlockedPilotIds(["lumi-asteria", "noa-celeste"]);
    expect(normalizeSelectedPilotId("noa-celeste", unlocked)).toBe("noa-celeste");
    expect(normalizeSelectedPilotId("rin-vega", unlocked)).toBe("lumi-asteria");
    expect(normalizeSelectedPilotId("forged-pilot", unlocked)).toBe("lumi-asteria");
  });

  it("preserves unlocked and selected pilots in new backup round trips", () => {
    const save = createDefaultSave();
    save.unlockedPilots.push("noa-celeste");
    save.selectedPilot = "noa-celeste";
    save.pilotProgress["noa-celeste"] = { level: 5, xp: 25 };
    const restored = verifyBackup(createBackup(save));
    expect(restored?.unlockedPilots).toContain("noa-celeste");
    expect(restored?.selectedPilot).toBe("noa-celeste");
    expect(restored?.pilotProgress["noa-celeste"]).toEqual({ level: 5, xp: 25 });
    expect(restored?.pilotLevel).toBe(5);
    expect(restored?.pilotXp).toBe(25);
  });

  it("loads a pre-pilot version 1 backup without dropping existing progress", () => {
    const restored = verifyBackup(LEGACY_BACKUP);
    expect(restored).not.toBeNull();
    expect(restored?.shards).toBe(120);
    expect(restored?.selectedShip).toBe("Aqua-Comet");
    expect(restored?.pilotLevel).toBe(4);
    expect(restored?.unlockedPilots).toEqual(["lumi-asteria"]);
    expect(restored?.selectedPilot).toBe("lumi-asteria");
  });

  it("migrates an existing local save record with no pilot fields without losing progress", () => {
    const legacy: Record<string, unknown> = {
      ...createDefaultSave(),
      shards: 120,
      unlockedShips: ["Lumen-01", "Aqua-Comet"],
      selectedShip: "Aqua-Comet",
      pilotLevel: 4,
      pilotXp: 25
    };
    delete legacy.unlockedPilots;
    delete legacy.selectedPilot;
    delete legacy.pilotProgress;

    const restored = sanitizeSaveData(legacy);
    expect(restored.shards).toBe(120);
    expect(restored.selectedShip).toBe("Aqua-Comet");
    expect(restored.pilotLevel).toBe(4);
    expect(restored.pilotXp).toBe(25);
    expect(restored.unlockedPilots).toEqual(["lumi-asteria"]);
    expect(restored.selectedPilot).toBe("lumi-asteria");
  });

  it("migrates shared XP from an intermediate save to its selected pilot", () => {
    const legacy: Record<string, unknown> = {
      ...createDefaultSave(),
      unlockedPilots: ["lumi-asteria", "noa-celeste"],
      selectedPilot: "noa-celeste",
      pilotLevel: 4,
      pilotXp: 25
    };
    delete legacy.pilotProgress;

    const restored = sanitizeSaveData(legacy);
    expect(restored.pilotProgress["noa-celeste"]).toEqual({ level: 4, xp: 25 });
    expect(restored.pilotProgress["lumi-asteria"]).toEqual({ level: 1, xp: 0 });
    expect(restored.pilotLevel).toBe(4);
    expect(restored.pilotXp).toBe(25);
  });

  it("keeps progress independent per unlocked pilot and drops forged pilot keys", () => {
    const save = createDefaultSave();
    save.unlockedPilots.push("noa-celeste");
    const clean = sanitizeSaveData({
      ...save,
      selectedPilot: "noa-celeste",
      pilotLevel: 7,
      pilotXp: 55,
      pilotProgress: {
        "lumi-asteria": { level: 3, xp: 20 },
        "noa-celeste": { level: 7, xp: 55 },
        "forged-pilot": { level: 99, xp: 999999 }
      }
    });
    expect(clean.pilotProgress).toEqual({
      "lumi-asteria": { level: 3, xp: 20 },
      "noa-celeste": { level: 7, xp: 55 }
    });
    expect(clean.pilotLevel).toBe(7);
    expect(clean.pilotXp).toBe(55);
  });

  it("caps level growth at +20% attack and grants one hull per ten levels", () => {
    expect(getPilotGrowthStats(1)).toEqual({ level: 1, attackMultiplier: 1, hullBonus: 0 });
    expect(getPilotGrowthStats(11)).toEqual({ level: 11, attackMultiplier: 1.1, hullBonus: 1 });
    expect(getPilotGrowthStats(100)).toEqual({ level: 100, attackMultiplier: 1.2, hullBonus: 9 });
    expect(getPilotGrowthStats(Number.NaN)).toEqual({ level: 1, attackMultiplier: 1, hullBonus: 0 });
  });

  it("sanitizes forged pilot identifiers in local and imported save data", () => {
    const save = createDefaultSave();
    const clean = sanitizeSaveData({
      ...save,
      unlockedPilots: ["lumi-asteria", "forged-pilot"],
      selectedPilot: "forged-pilot"
    });
    expect(clean.unlockedPilots).toEqual(["lumi-asteria"]);
    expect(clean.selectedPilot).toBe("lumi-asteria");
  });
});


describe("pilot-specific skills, narrative and flight animation", () => {
  it("gives each pilot an authored skill, personal introduction and animation style", () => {
    const pilots = ["lumi-asteria", "noa-celeste", "rin-vega"].map(getPilotProfile);
    expect(new Set(pilots.map((pilot) => pilot.skillType)).size).toBe(3);
    expect(pilots.every((pilot) => pilot.skillName.length > 0)).toBe(true);
    expect(pilots.every((pilot) => pilot.skillDescription.length > 0)).toBe(true);
    expect(pilots.every((pilot) => pilot.storyIntro.length > 0)).toBe(true);
    expect(new Set(pilots.map((pilot) => pilot.animationStyle)).size).toBe(3);
  });
});

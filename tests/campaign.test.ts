import { describe, expect, it } from "vitest";
import {
  ALL_BOSS_IDS, PLANET_ORDER, PLANETS, getEndlessBossProfile, getPlanetProfile,
  isPlanetUnlocked, normalizeCompletedPlanetIds, normalizeSelectedPlanetId
} from "../src/game/campaign";

describe("planetary campaign and boss archive", () => {
  it("defines three planets with unique bosses and distinct attack patterns", () => {
    expect(PLANET_ORDER).toHaveLength(3);
    expect(new Set(ALL_BOSS_IDS).size).toBe(3);
    expect(new Set(PLANET_ORDER.map((id) => PLANETS[id].boss.attackPattern)).size).toBe(3);
    expect(new Set(PLANET_ORDER.map((id) => PLANETS[id].backgroundColor)).size).toBe(3);
  });

  it("unlocks planets sequentially only after the previous story clear", () => {
    expect(isPlanetUnlocked("aurora-prime", [])).toBe(true);
    expect(isPlanetUnlocked("pyra-reach", [])).toBe(false);
    expect(isPlanetUnlocked("pyra-reach", ["aurora-prime"])).toBe(true);
    expect(isPlanetUnlocked("noctis-archive", ["aurora-prime"])).toBe(false);
    expect(isPlanetUnlocked("noctis-archive", ["aurora-prime", "pyra-reach"])).toBe(true);
    expect(normalizeSelectedPlanetId("noctis-archive", [])).toBe("aurora-prime");
  });

  it("normalizes collection entries and rotates endless bosses", () => {
    expect(normalizeCompletedPlanetIds(["noctis-archive", "forged", "aurora-prime"]))
      .toEqual(["aurora-prime"]);
    expect(getEndlessBossProfile(0).id).toBe(getPlanetProfile("aurora-prime").boss.id);
    expect(getEndlessBossProfile(1).id).toBe(getPlanetProfile("pyra-reach").boss.id);
    expect(getEndlessBossProfile(3).id).toBe(getEndlessBossProfile(0).id);
    expect(getEndlessBossProfile(-4).id).toBe(getEndlessBossProfile(0).id);
  });

  it("gives every boss a meaningful weakness multiplier and a positive clear reward", () => {
    for (const planetId of PLANET_ORDER) {
      const boss = PLANETS[planetId].boss;
      expect(boss.maxHp).toBeGreaterThan(0);
      expect(boss.weakpointMultiplier).toBeGreaterThan(1);
      expect(boss.rewardShards).toBeGreaterThan(0);
      expect(boss.scoreReward).toBeGreaterThan(0);
    }
  });
});


describe("planet-specific mid-sortie events", () => {
  it("schedules an original event with pilot dialogue and a bounded duration on every planet", () => {
    for (const id of PLANET_ORDER) {
      const event = PLANETS[id].missionEvent;
      expect(event.id.length).toBeGreaterThan(0);
      expect(event.name.length).toBeGreaterThan(0);
      expect(event.triggerAtSeconds).toBeGreaterThan(0);
      expect(event.durationSeconds).toBeGreaterThan(0);
      expect(event.triggerAtSeconds + event.durationSeconds).toBeLessThan(30);
      expect(["resonance", "gravity-shear", "archive-ward"]).toContain(event.kind);
      expect(event.pilotDialogue["lumi-asteria"]).toBeTruthy();
      expect(event.pilotDialogue["noa-celeste"]).toBeTruthy();
      expect(event.pilotDialogue["rin-vega"]).toBeTruthy();
    }
  });

  it("assigns different tactical effects to the three planetary events", () => {
    expect(PLANETS["aurora-prime"].missionEvent.kind).toBe("resonance");
    expect(PLANETS["pyra-reach"].missionEvent.kind).toBe("gravity-shear");
    expect(PLANETS["noctis-archive"].missionEvent.kind).toBe("archive-ward");
    expect(new Set(PLANET_ORDER.map((id) => PLANETS[id].missionEvent.id)).size).toBe(3);
  });
});

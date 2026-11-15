import { describe, expect, it } from "vitest";
import {
  ALL_WEAPON_IDS, WEAPON_PROFILES, getWeaponProfile,
  normalizeEquippedWeaponIds, normalizeUnlockedWeaponIds, normalizeWeaponSlot
} from "../src/game/weapons";

describe("weapon lab", () => {
  it("provides five mechanically distinct weapons with bounded values", () => {
    expect(ALL_WEAPON_IDS).toHaveLength(5);
    expect(WEAPON_PROFILES["prism-laser"].fireIntervalMultiplier).toBeGreaterThan(1);
    expect(WEAPON_PROFILES["comet-homing"].homing).toBe(true);
    expect(WEAPON_PROFILES["nova-piercer"].pierce).toBeGreaterThan(0);
    expect(WEAPON_PROFILES["eclipse-lance"].homing).toBe(true);
    expect(WEAPON_PROFILES["eclipse-lance"].pierce).toBe(1);
    expect(WEAPON_PROFILES["eclipse-lance"].damageMultiplier).toBeGreaterThan(WEAPON_PROFILES["nova-piercer"].damageMultiplier);
    for (const profile of Object.values(WEAPON_PROFILES)) {
      expect(profile.damageMultiplier).toBeGreaterThan(0);
      expect(profile.projectileSpeed).toBeGreaterThan(0);
      expect(profile.radius).toBeGreaterThan(0);
      expect(profile.unlockCost).toBeGreaterThanOrEqual(0);
    }
  });

  it("filters invalid and duplicate unlock identifiers", () => {
    expect(normalizeUnlockedWeaponIds(["comet-homing", "comet-homing", "forged"])).toEqual([
      "photon-pulse", "comet-homing"
    ]);
  });

  it("fills two slots only with unlocked identifiers", () => {
    const unlocked = normalizeUnlockedWeaponIds(["prism-laser", "comet-homing"]);
    expect(normalizeEquippedWeaponIds(["comet-homing", "forged", "prism-laser"], unlocked))
      .toEqual(["comet-homing", "prism-laser"]);
    expect(normalizeEquippedWeaponIds([], unlocked)).toEqual(["photon-pulse", "photon-pulse"]);
  });

  it("normalizes only the two valid weapon slots and safe profile lookup", () => {
    expect(normalizeWeaponSlot(1)).toBe(1);
    expect(normalizeWeaponSlot(99)).toBe(0);
    expect(getWeaponProfile("unknown").id).toBe("photon-pulse");
  });
});

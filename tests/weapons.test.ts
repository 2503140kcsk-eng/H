import { describe, expect, it } from "vitest";
import { createBackup, createDefaultSave, sanitizeSaveData, verifyBackup } from "../src/game/core";
import {
  ALL_WEAPON_IDS,
  DEFAULT_WEAPON_ID,
  WEAPON_PROFILES,
  getWeaponProfile,
  normalizeSelectedWeaponId,
  normalizeUnlockedWeaponIds
} from "../src/game/weapons";

const LEGACY_BACKUP_WITHOUT_WEAPONS = JSON.stringify({
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

describe("weapon roster", () => {
  it("defines three bounded weapon profiles with distinct firing patterns", () => {
    expect(ALL_WEAPON_IDS).toEqual(["star-pulse", "prism-fan", "nova-lance"]);
    expect(getWeaponProfile(DEFAULT_WEAPON_ID)).toMatchObject({
      projectileCount: 1,
      pierceTargets: 0
    });
    expect(getWeaponProfile("prism-fan")).toMatchObject({
      projectileCount: 3,
      pierceTargets: 0
    });
    expect(getWeaponProfile("nova-lance")).toMatchObject({
      projectileCount: 1,
      pierceTargets: 1
    });
    for (const weapon of Object.values(WEAPON_PROFILES)) {
      expect(weapon.projectileCount).toBeGreaterThanOrEqual(1);
      expect(weapon.projectileCount).toBeLessThanOrEqual(3);
      expect(weapon.fireIntervalMultiplier).toBeGreaterThan(0);
      expect(weapon.damageMultiplier).toBeGreaterThan(0);
      expect(weapon.projectileSpeed).toBeGreaterThan(0);
      expect(weapon.projectileRadius).toBeGreaterThan(0);
      expect(weapon.pierceTargets).toBeGreaterThanOrEqual(0);
    }
  });

  it("filters forged and duplicate weapon identifiers and always retains the default", () => {
    expect(normalizeUnlockedWeaponIds(["nova-lance", "nova-lance", "forged-weapon"])).toEqual([
      "star-pulse",
      "nova-lance"
    ]);
  });

  it("does not select a locked or unknown weapon", () => {
    const unlocked = normalizeUnlockedWeaponIds(["star-pulse", "prism-fan"]);
    expect(normalizeSelectedWeaponId("prism-fan", unlocked)).toBe("prism-fan");
    expect(normalizeSelectedWeaponId("nova-lance", unlocked)).toBe("star-pulse");
    expect(normalizeSelectedWeaponId("forged-weapon", unlocked)).toBe("star-pulse");
  });
});

describe("weapon save and backup compatibility", () => {
  it("starts new saves with only the default weapon unlocked", () => {
    const save = createDefaultSave();
    expect(save.unlockedWeapons).toEqual(["star-pulse"]);
    expect(save.selectedWeapon).toBe("star-pulse");
  });

  it("migrates a local save without weapon fields without losing progression", () => {
    const legacy: Record<string, unknown> = {
      ...createDefaultSave(),
      shards: 520,
      selectedShip: "Aqua-Comet"
    };
    delete legacy.unlockedWeapons;
    delete legacy.selectedWeapon;

    const restored = sanitizeSaveData(legacy);
    expect(restored.shards).toBe(520);
    expect(restored.selectedShip).toBe("Aqua-Comet");
    expect(restored.unlockedWeapons).toEqual(["star-pulse"]);
    expect(restored.selectedWeapon).toBe("star-pulse");
  });

  it("keeps weapon unlocks and selection in the JSON backup round trip", () => {
    const save = createDefaultSave();
    save.shards = 200;
    save.unlockedWeapons.push("prism-fan");
    save.selectedWeapon = "prism-fan";

    const restored = verifyBackup(createBackup(save));
    expect(restored?.unlockedWeapons).toEqual(["star-pulse", "prism-fan"]);
    expect(restored?.selectedWeapon).toBe("prism-fan");
  });

  it("rejects forged weapon ids at the save boundary", () => {
    const save = createDefaultSave();
    const restored = sanitizeSaveData({
      ...save,
      unlockedWeapons: ["star-pulse", "forged-weapon"],
      selectedWeapon: "forged-weapon"
    });
    expect(restored.unlockedWeapons).toEqual(["star-pulse"]);
    expect(restored.selectedWeapon).toBe("star-pulse");
  });

  it("loads an existing version 1 backup that predates the weapon roster", () => {
    const restored = verifyBackup(LEGACY_BACKUP_WITHOUT_WEAPONS);
    expect(restored).not.toBeNull();
    expect(restored?.shards).toBe(120);
    expect(restored?.selectedShip).toBe("Aqua-Comet");
    expect(restored?.pilotLevel).toBe(4);
    expect(restored?.unlockedWeapons).toEqual(["star-pulse"]);
    expect(restored?.selectedWeapon).toBe("star-pulse");
  });
});

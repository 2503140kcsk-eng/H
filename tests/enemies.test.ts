import { describe, expect, it } from "vitest";
import {
  ENEMY_PROFILES,
  absorbGuardianShield,
  getUnlockedEnemyKinds,
  selectEnemyKind
} from "../src/game/enemies";

describe("enemy roster and tactics", () => {
  it("defines nine non-boss enemy roles with distinct attack and movement profiles", () => {
    const profiles = Object.values(ENEMY_PROFILES);
    expect(profiles).toHaveLength(9);
    expect(new Set(profiles.map((profile) => profile.attack)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(profiles.map((profile) => profile.movement)).size).toBeGreaterThanOrEqual(5);
    for (const profile of profiles) {
      expect(profile.health).toBeGreaterThan(0);
      expect(profile.speed).toBeGreaterThan(0);
      expect(profile.radius).toBeGreaterThan(0);
      expect(profile.fireInterval).toBeGreaterThan(0);
    }
    expect(ENEMY_PROFILES.guardian.shield).toBeGreaterThan(0);
  });

  it("unlocks additional tactics progressively as a run advances", () => {
    expect(getUnlockedEnemyKinds(0)).toEqual(["scout", "interceptor", "heavy"]);
    expect(getUnlockedEnemyKinds(5)).toHaveLength(3);
    expect(getUnlockedEnemyKinds(6)).toHaveLength(4);
    expect(getUnlockedEnemyKinds(12)).toHaveLength(5);
    expect(getUnlockedEnemyKinds(18)).toHaveLength(6);
    expect(getUnlockedEnemyKinds(24)).toHaveLength(7);
    expect(getUnlockedEnemyKinds(30)).toHaveLength(8);
    expect(getUnlockedEnemyKinds(36)).toHaveLength(9);
  });

  it("selects only unlocked enemies and bounds random inputs", () => {
    expect(selectEnemyKind(0, 0)).toBe("scout");
    expect(selectEnemyKind(0, 1)).toBe("heavy");
    expect(selectEnemyKind(0, Number.NaN)).toBe("scout");
    expect(selectEnemyKind(120, 0.999999)).toBe("elite");
  });

  it("spends a guardian shield before allowing damage to reach hull", () => {
    expect(absorbGuardianShield(3, 2)).toEqual({ remainingShield: 1, remainingDamage: 0 });
    expect(absorbGuardianShield(2, 5)).toEqual({ remainingShield: 0, remainingDamage: 3 });
    expect(absorbGuardianShield(-1, -4)).toEqual({ remainingShield: 0, remainingDamage: 0 });
  });
});

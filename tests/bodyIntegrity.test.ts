import { describe, expect, it } from "vitest";
import {
  createBodyIntegrity,
  damageBodyPart,
  getBodyIntegrityEffects,
  selectImpactPart
} from "../src/game/bodyIntegrity";

describe("target-local body part selection", () => {
  it("routes wing, weapon and core impacts to distinct modules", () => {
    const integrity = createBodyIntegrity("fighter");
    expect(selectImpactPart(integrity, -0.8, 0, 1)).toBe("leftWing");
    expect(selectImpactPart(integrity, 0.8, 0, 1)).toBe("rightWing");
    expect(selectImpactPart(integrity, 0, -0.7, 1)).toBe("weapon");
    expect(selectImpactPart(integrity, 0, 0.1, 1)).toBe("core");
  });

  it("selects a guardian shield emitter from its upper central zone", () => {
    const integrity = createBodyIntegrity("guardian");
    expect(selectImpactPart(integrity, 0, 0.8, 1)).toBe("shieldEmitter");
  });
});

describe("part integrity and consequences", () => {
  it("keeps separate copies and does not mutate the original integrity", () => {
    const original = createBodyIntegrity("fighter");
    const result = damageBodyPart(original, "leftWing", 1);
    expect(result.damaged).toBe(true);
    expect(result.integrity).not.toBe(original);
    expect(original.parts.leftWing?.hp).toBe(2);
    expect(result.integrity.parts.leftWing?.hp).toBe(1);
  });

  it("disables weapon fire when the weapon module is destroyed", () => {
    let integrity = createBodyIntegrity("fighter");
    integrity = damageBodyPart(integrity, "weapon", 99).integrity;
    expect(getBodyIntegrityEffects(integrity).canAttack).toBe(false);
    const repeated = damageBodyPart(integrity, "weapon", 99);
    expect(repeated.newlyDestroyed).toBe(false);
    expect(repeated.damaged).toBe(false);
  });

  it("collapses guardian shielding when its emitter is destroyed", () => {
    const integrity = damageBodyPart(createBodyIntegrity("guardian"), "shieldEmitter", 3).integrity;
    expect(getBodyIntegrityEffects(integrity).shieldActive).toBe(false);
  });

  it("reduces mobility after a wing is lost and removes that side of a boss volley", () => {
    const integrity = damageBodyPart(createBodyIntegrity("boss"), "leftWing", 99).integrity;
    const effects = getBodyIntegrityEffects(integrity);
    expect(effects.lateralMovementMultiplier).toBe(0.68);
    expect(effects.leftVolleyEnabled).toBe(false);
    expect(effects.rightVolleyEnabled).toBe(true);
  });

  it("exposes a damaged core and makes damage escalation explicit", () => {
    const integrity = damageBodyPart(createBodyIntegrity("armored"), "core", 0.5).integrity;
    expect(getBodyIntegrityEffects(integrity).coreDamageMultiplier).toBe(1.3);
  });

  it("ignores invalid, negative and unknown-part damage safely", () => {
    const integrity = createBodyIntegrity("fighter");
    expect(damageBodyPart(integrity, "leftWing", -5).damaged).toBe(false);
    expect(damageBodyPart(integrity, "leftWing", Number.NaN).damaged).toBe(false);
    expect(damageBodyPart(integrity, "shieldEmitter", 5).damaged).toBe(false);
  });
});

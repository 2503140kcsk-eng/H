import { describe, expect, it } from "vitest";
import {
  applyBossPartDamage,
  getBossAttackInterval,
  getBossPhase,
  getBossVolleyCount,
  isBossWeakpointOpen
} from "../src/game/boss-mechanics";

describe("boss phase and destructible-part rules", () => {
  it("uses three telegraphed health phases", () => {
    expect(getBossPhase(80, 100)).toBe(1);
    expect(getBossPhase(50, 100)).toBe(2);
    expect(getBossPhase(25, 100)).toBe(3);
    expect(getBossPhase(-1, 100)).toBe(3);
  });

  it("shortens the exposed-core cycle and raises volleys as the boss evolves", () => {
    expect(isBossWeakpointOpen(1, 1, false)).toBe(true);
    expect(isBossWeakpointOpen(1, 3, false)).toBe(true);
    expect(isBossWeakpointOpen(2, 3, false)).toBe(false);
    expect(isBossWeakpointOpen(1, 1, true)).toBe(false);
    expect(getBossAttackInterval(3)).toBeLessThan(getBossAttackInterval(1));
    expect(getBossVolleyCount(3)).toBeGreaterThan(getBossVolleyCount(2));
  });

  it("destroys a body part exactly once and ignores invalid damage", () => {
    const intact = { hp: 20, maxHp: 20, destroyed: false };
    expect(applyBossPartDamage(intact, 8)).toEqual({ hp: 12, maxHp: 20, destroyed: false });
    const broken = applyBossPartDamage(intact, 25);
    expect(broken).toEqual({ hp: 0, maxHp: 20, destroyed: true });
    expect(applyBossPartDamage(broken, 99)).toEqual(broken);
    expect(applyBossPartDamage(intact, Number.NaN)).toEqual(intact);
  });
});

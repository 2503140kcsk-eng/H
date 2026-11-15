import { describe, expect, it } from "vitest";
import {
  canUnlockPilotSkill,
  getPilotSkillBonuses,
  getUnspentSkillPoints,
  normalizePilotSkills
} from "../src/game/pilot-skills";

describe("pilot-specific skill trees", () => {
  it("requires level, prerequisite and an unspent point", () => {
    expect(canUnlockPilotSkill("lumi-asteria", "lumi-stellar-focus", 1, [])).toBe(false);
    expect(canUnlockPilotSkill("lumi-asteria", "lumi-stellar-focus", 2, [])).toBe(true);
    expect(canUnlockPilotSkill("lumi-asteria", "lumi-combo-catalyst", 4, [])).toBe(false);
    expect(canUnlockPilotSkill("lumi-asteria", "lumi-combo-catalyst", 4, ["lumi-stellar-focus"])).toBe(true);
    expect(getUnspentSkillPoints(4, ["lumi-stellar-focus", "lumi-combo-catalyst"])).toBe(1);
  });

  it("gives the three pilots mechanically different skill effects", () => {
    expect(getPilotSkillBonuses("lumi-asteria", ["lumi-stellar-focus"]).attackMultiplier).toBeCloseTo(1.08);
    expect(getPilotSkillBonuses("noa-celeste", ["noa-aegis-frame"]).hullBonus).toBe(1);
    expect(getPilotSkillBonuses("rin-vega", ["rin-comet-vector"]).movementMultiplier).toBeCloseTo(1.08);
  });

  it("filters forged ids, locked pilots, over-level nodes and broken prerequisites", () => {
    const clean = normalizePilotSkills({
      "lumi-asteria": ["lumi-stellar-focus", "lumi-orbit-reader", "forged-node"],
      "noa-celeste": ["noa-aegis-frame"],
      "rin-vega": ["rin-comet-vector"]
    }, ["lumi-asteria", "noa-celeste"], {
      "lumi-asteria": { level: 4, xp: 0 },
      "noa-celeste": { level: 2, xp: 0 }
    });
    expect(clean["lumi-asteria"]).toEqual(["lumi-stellar-focus"]);
    expect(clean["noa-celeste"]).toEqual(["noa-aegis-frame"]);
    expect(clean["rin-vega"]).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import {
  getStoryChoiceKey,
  getStoryScene,
  getStoryCombatBonuses,
  hasSecretStarRoute,
  normalizeStoryChoices
} from "../src/game/narrative";

describe("branching pilot narrative", () => {
  it("provides distinct dialogue and choices for each pilot and planet", () => {
    const lumi = getStoryScene("lumi-asteria", "aurora-prime", {});
    const noa = getStoryScene("noa-celeste", "aurora-prime", {});
    const rin = getStoryScene("rin-vega", "aurora-prime", {});
    expect(new Set([lumi?.prompt, noa?.prompt, rin?.prompt]).size).toBe(3);
    expect(lumi?.choices).toHaveLength(2);
  });

  it("persists a selected branch response and derives the hidden route only from all three choices", () => {
    const choices = {
      [getStoryChoiceKey("lumi-asteria", "aurora-prime")]: "follow-signal",
      [getStoryChoiceKey("lumi-asteria", "pyra-reach")]: "follow-signal"
    };
    expect(hasSecretStarRoute("lumi-asteria", choices)).toBe(false);
    const complete = { ...choices, [getStoryChoiceKey("lumi-asteria", "noctis-archive")]: "follow-signal" };
    expect(hasSecretStarRoute("lumi-asteria", complete)).toBe(true);
    expect(getStoryScene("lumi-asteria", "noctis-archive", complete)?.response).toContain("星環ルート");
  });


  it("turns a narrative decision into a distinct sortie preparation bonus", () => {
    expect(getStoryCombatBonuses("follow-signal")).toEqual({
      weakpointMultiplier: 1.1, hullBonus: 0, shieldRechargeMultiplier: 1
    });
    expect(getStoryCombatBonuses("protect-crew")).toEqual({
      weakpointMultiplier: 1, hullBonus: 1, shieldRechargeMultiplier: 1.1
    });
    expect(getStoryCombatBonuses(undefined)).toEqual({
      weakpointMultiplier: 1, hullBonus: 0, shieldRechargeMultiplier: 1
    });
  });

  it("drops unknown pilot, planet and branch values", () => {
    expect(getStoryScene("forged-pilot", "aurora-prime", {})).toBeNull();
    const clean = normalizeStoryChoices({
      "lumi-asteria:aurora-prime": "forged",
      "rin-vega:noctis-archive": "protect-crew"
    });
    expect(clean).toEqual({ "rin-vega:noctis-archive": "protect-crew" });
  });
});

import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, evaluateAchievements, normalizeAchievementIds } from "../src/game/achievements";

describe("achievement unlock rules", () => {
  it("keeps hidden achievements locked until their actual conditions are met", () => {
    expect(evaluateAchievements({
      totalRuns: 0, kills: 0, score: 0, bossesDefeated: [],
      completedPlanets: [], unlockedWeapons: ["photon-pulse"]
    }, [])).toEqual([]);
  });

  it("unlocks only earned achievements and never returns a duplicate unlock", () => {
    const result = evaluateAchievements({
      totalRuns: 1, kills: 55, score: 6200,
      bossesDefeated: ["nebula-empress"],
      completedPlanets: ["aurora-prime", "pyra-reach", "noctis-archive"],
      unlockedWeapons: ["photon-pulse", "prism-laser", "comet-homing", "nova-piercer", "eclipse-lance"]
    }, ["first-flight"]);
    expect(result).toContain("core-breaker");
    expect(result).toContain("ace-pilot");
    expect(result).toContain("star-score");
    expect(result).toContain("arsenal");
    expect(result).toContain("galaxy-keeper");
    expect(result).not.toContain("first-flight");
  });

  it("normalizes the archive and exposes readable achievement definitions", () => {
    expect(normalizeAchievementIds(["fake", "star-score", "star-score"])).toEqual(["star-score"]);
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(5);
  });
});

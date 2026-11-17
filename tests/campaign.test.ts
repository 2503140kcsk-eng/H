import { describe, expect, it } from "vitest";
import {
  activateCampaignMission, CAMPAIGN_CHAPTERS, completeCampaignMission, createCampaignCombatProfile,
  createCampaignState, deriveCampaignWorld, getAvailableCampaignMissions, getNextCampaignChapter,
  resolveCampaignEnding, sanitizeCampaignState, selectCampaignChoice, startNewCampaignRoute
} from "../src/game/campaign";

describe("Echo Chronicle campaign domain", () => {
  it("keeps the three chapters in a strict progression and prevents future decisions", () => {
    let state = createCampaignState();
    expect(CAMPAIGN_CHAPTERS).toHaveLength(3);
    expect(getNextCampaignChapter(state)?.id).toBe("aurora-prime");
    const blocked = selectCampaignChoice(state, "pyra-reach", "rescue");
    expect(blocked).toBe(state);
    state = selectCampaignChoice(state, "aurora-prime", "attune");
    expect(state.choices["aurora-prime"]).toBe("attune");
    expect(getAvailableCampaignMissions(state).map((mission) => mission.id)).toContain("aurora-first-contact");
  });

  it("turns a choice into persistent world pressure rather than a cosmetic flag", () => {
    let state = createCampaignState();
    state = selectCampaignChoice(state, "aurora-prime", "sever");
    const before = deriveCampaignWorld(state);
    expect(before.intel).toBe(2);
    expect(before.anomaly).toBe(-1);
    const profile = createCampaignCombatProfile(state, "aurora-first-contact");
    expect(profile?.battleEvent).toBe("signal-exposure");
    expect(profile?.enemyPriority).toContain("sniper");
  });

  it("unlocks only the side mission matching the completed chapter choice", () => {
    let state = createCampaignState();
    state = selectCampaignChoice(state, "aurora-prime", "attune");
    state = activateCampaignMission(state, "aurora-first-contact");
    state = completeCampaignMission(state, "aurora-first-contact", "clear");
    const available = getAvailableCampaignMissions(state).map((mission) => mission.id);
    expect(available).toContain("aurora-prism-vault");
    expect(available).not.toContain("aurora-silent-wreck");
    state = completeCampaignMission(state, "aurora-prism-vault", "clear");
    expect(deriveCampaignWorld(state).resonance).toBe(3);
  });

  it("makes the secret memory vault require the rescue-and-attunement route", () => {
    let state = createCampaignState();
    state = selectCampaignChoice(state, "aurora-prime", "attune");
    state = completeCampaignMission(state, "aurora-first-contact", "clear");
    state = selectCampaignChoice(state, "pyra-reach", "rescue");
    state = completeCampaignMission(state, "pyra-crossfire", "clear");
    state = selectCampaignChoice(state, "noctis-archive", "merge");
    expect(getAvailableCampaignMissions(state).map((mission) => mission.id)).toContain("noctis-memory-vault");
    state = completeCampaignMission(state, "noctis-memory-vault", "clear");
    expect(resolveCampaignEnding(state)).toBe("starborn");
  });

  it("selects materially different boss and battlefield profiles for different routes", () => {
    let rescued = createCampaignState();
    rescued = selectCampaignChoice(rescued, "aurora-prime", "attune");
    rescued = selectCampaignChoice(rescued, "pyra-reach", "rescue");
    const rescueProfile = createCampaignCombatProfile(rescued, "pyra-crossfire");
    let hunted = createCampaignState();
    hunted = selectCampaignChoice(hunted, "aurora-prime", "sever");
    hunted = selectCampaignChoice(hunted, "pyra-reach", "pursue");
    const pursuitProfile = createCampaignCombatProfile(hunted, "pyra-crossfire");
    expect(rescueProfile?.battleEvent).toBe("rescue-support");
    expect(pursuitProfile?.battleEvent).toBe("signal-exposure");
    expect(rescueProfile?.enemyPriority).not.toEqual(pursuitProfile?.enemyPriority);
    expect(rescueProfile?.bossPattern).not.toBe(pursuitProfile?.bossPattern);
  });

  it("archives ending history while resetting branch state for replay", () => {
    let state = createCampaignState();
    state = { ...state, endingHistory: ["liberation"], replayCount: 0, endingId: "liberation" };
    const replay = startNewCampaignRoute(state);
    expect(replay.replayCount).toBe(1);
    expect(replay.endingHistory).toEqual(["liberation"]);
    expect(replay.choices["aurora-prime"]).toBeNull();
    expect(replay.completedMissionIds).toEqual([]);
  });

  it("sanitizes unknown mission ids, invalid choices and unbounded replay counters", () => {
    const safe = sanitizeCampaignState({
      choices: { "aurora-prime": "admin-choice", "pyra-reach": "pursue" },
      completedMissionIds: ["unknown", "pyra-crossfire", "pyra-crossfire"],
      endingHistory: ["fake", "quiet-orbit"],
      replayCount: 1e20
    });
    expect(safe.choices["aurora-prime"]).toBeNull();
    expect(safe.choices["pyra-reach"]).toBe("pursue");
    expect(safe.completedMissionIds).toEqual(["pyra-crossfire"]);
    expect(safe.endingHistory).toEqual(["quiet-orbit"]);
    expect(safe.replayCount).toBe(1000);
  });
});

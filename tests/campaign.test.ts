import { describe, expect, it } from "vitest";
import {
  activateCampaignMission, CAMPAIGN_CHAPTERS, completeCampaignMission, createCampaignCombatProfile, getCampaignPilotReaction,
  createCampaignState, deriveCampaignWorld, getAvailableCampaignMissions, getCampaignFormationSlots, getNextCampaignChapter,
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
    rescued = completeCampaignMission(rescued, "aurora-first-contact", "clear");
    rescued = selectCampaignChoice(rescued, "pyra-reach", "rescue");
    const rescueProfile = createCampaignCombatProfile(rescued, "pyra-crossfire");
    let hunted = createCampaignState();
    hunted = selectCampaignChoice(hunted, "aurora-prime", "sever");
    hunted = completeCampaignMission(hunted, "aurora-first-contact", "clear");
    hunted = selectCampaignChoice(hunted, "pyra-reach", "pursue");
    const pursuitProfile = createCampaignCombatProfile(hunted, "pyra-crossfire");
    expect(rescueProfile?.battleEvent).toBe("rescue-support");
    expect(pursuitProfile?.battleEvent).toBe("signal-exposure");
    expect(rescueProfile?.enemyPriority).not.toEqual(pursuitProfile?.enemyPriority);
    expect(rescueProfile?.bossPattern).not.toBe(pursuitProfile?.bossPattern);
    expect(rescueProfile?.formation).toBe("rescue-screen");
    expect(pursuitProfile?.formation).toBe("cipher-pincer");
    expect(rescueProfile?.palette).not.toEqual(pursuitProfile?.palette);
  });

  it("keeps all six authored formation layouts distinct and respects unlock gates", () => {
    const formations = [
      "prism-escort", "signal-hunt", "rescue-screen",
      "cipher-pincer", "memory-mirror", "stasis-lattice"
    ] as const;
    const unlocked = ["scout", "interceptor", "heavy"] as const;
    const signatures = formations.map((formation) => {
      const slots = getCampaignFormationSlots(formation, ["sniper", "guardian"], unlocked, "scout");
      expect(slots).toHaveLength(3);
      expect(slots.every((slot) => unlocked.includes(slot.kind as typeof unlocked[number]))).toBe(true);
      expect(slots.every((slot) => Number.isFinite(slot.dx) && Number.isFinite(slot.dy))).toBe(true);
      return slots.map((slot) => `${slot.kind}:${slot.dx}:${slot.dy}`).join("|");
    });
    expect(new Set(signatures).size).toBe(6);
    const fallback = getCampaignFormationSlots("memory-mirror", [], ["scout"], "scout");
    expect(fallback.every((slot) => slot.kind === "scout")).toBe(true);
  });

  it("gives each pilot a distinct value-based reaction to the same decision", () => {
    const lumi = getCampaignPilotReaction("aurora-prime", "attune", "lumi-asteria");
    const noa = getCampaignPilotReaction("aurora-prime", "attune", "noa-celeste");
    const rin = getCampaignPilotReaction("aurora-prime", "attune", "rin-vega");
    expect(new Set([lumi, noa, rin]).size).toBe(3);
    expect(getCampaignPilotReaction("pyra-reach", "rescue", "noa-celeste")).toContain("シールド");
    expect(getCampaignPilotReaction("aurora-prime", "attune", "unknown-pilot")).toBe(lumi);
  });

  it("maps Noctis choices to a memory reversal or a true stasis lock event", () => {
    let merged = createCampaignState();
    merged = selectCampaignChoice(merged, "aurora-prime", "attune");
    merged = completeCampaignMission(merged, "aurora-first-contact", "clear");
    merged = selectCampaignChoice(merged, "pyra-reach", "rescue");
    merged = completeCampaignMission(merged, "pyra-crossfire", "clear");
    merged = selectCampaignChoice(merged, "noctis-archive", "merge");
    const mergeProfile = createCampaignCombatProfile(merged, "noctis-the-last-record");

    let sealed = createCampaignState();
    sealed = selectCampaignChoice(sealed, "aurora-prime", "sever");
    sealed = completeCampaignMission(sealed, "aurora-first-contact", "clear");
    sealed = selectCampaignChoice(sealed, "pyra-reach", "pursue");
    sealed = completeCampaignMission(sealed, "pyra-crossfire", "clear");
    sealed = selectCampaignChoice(sealed, "noctis-archive", "seal");
    const sealProfile = createCampaignCombatProfile(sealed, "noctis-the-last-record");

    expect(mergeProfile?.battleEvent).toBe("memory-reversal");
    expect(sealProfile?.battleEvent).toBe("stasis-lock");
    expect(mergeProfile?.bossPattern).toBe("homing");
    expect(sealProfile?.bossPattern).toBe("spread");
    expect(mergeProfile?.bossName).not.toBe(sealProfile?.bossName);
  });

  it("distinguishes Liberation, Quiet Orbit and Fractured Ring from route evidence", () => {
    const mainMissions = ["aurora-first-contact", "pyra-crossfire", "noctis-the-last-record"];
    const liberated = {
      ...createCampaignState(),
      choices: { "aurora-prime": "sever", "pyra-reach": "rescue", "noctis-archive": "merge" },
      completedMissionIds: [...mainMissions, "pyra-lifeline"]
    };
    const quiet = {
      ...createCampaignState(),
      choices: { "aurora-prime": "sever", "pyra-reach": "pursue", "noctis-archive": "seal" },
      completedMissionIds: mainMissions
    };
    const fractured = {
      ...createCampaignState(),
      choices: { "aurora-prime": "attune", "pyra-reach": "rescue", "noctis-archive": "merge" },
      completedMissionIds: mainMissions
    };
    expect(resolveCampaignEnding(liberated)).toBe("liberation");
    expect(resolveCampaignEnding(quiet)).toBe("quiet-orbit");
    expect(resolveCampaignEnding(fractured)).toBe("fractured-ring");
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

  it("does not append the same ending twice when another side operation clears", () => {
    let state = createCampaignState();
    state = {
      ...state,
      choices: { "aurora-prime": "sever", "pyra-reach": "pursue", "noctis-archive": "seal" },
      completedMissionIds: ["aurora-first-contact", "pyra-crossfire", "noctis-the-last-record"],
      endingId: "quiet-orbit",
      endingHistory: ["quiet-orbit"]
    };
    const repeated = completeCampaignMission(state, "noctis-the-last-record", "clear");
    expect(repeated.endingHistory).toEqual(["quiet-orbit"]);
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

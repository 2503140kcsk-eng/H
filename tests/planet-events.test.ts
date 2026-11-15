import { describe, expect, it } from "vitest";
import { PLANET_ORDER, PLANETS } from "../src/game/campaign";

describe("multi-stage branching planetary events", () => {
  it("defines a second timed stage after the first event can complete", () => {
    for (const planetId of PLANET_ORDER) {
      const event = PLANETS[planetId].missionEvent;
      expect(event.followUps["follow-signal"].triggerAtSeconds)
        .toBeGreaterThanOrEqual(event.triggerAtSeconds + event.durationSeconds);
      expect(event.followUps["protect-crew"].triggerAtSeconds)
        .toBeGreaterThanOrEqual(event.triggerAtSeconds + event.durationSeconds);
      expect(event.followUps["follow-signal"].durationSeconds).toBeGreaterThan(0);
      expect(event.followUps["protect-crew"].durationSeconds).toBeGreaterThan(0);
    }
  });

  it("branches each planet into offensive analysis or defensive escort events", () => {
    for (const planetId of PLANET_ORDER) {
      const { followUps } = PLANETS[planetId].missionEvent;
      expect(followUps["follow-signal"].kind).toBe("damage-boost");
      expect(followUps["protect-crew"].kind).toBe("shield-ward");
      expect(followUps["follow-signal"].name).not.toBe(followUps["protect-crew"].name);
      expect(new Set(Object.values(followUps).map((stage) => stage.id)).size).toBe(2);
      expect(Object.keys(followUps["follow-signal"].pilotDialogue)).toEqual(
        expect.arrayContaining(["lumi-asteria", "noa-celeste", "rin-vega"])
      );
    }
  });
});

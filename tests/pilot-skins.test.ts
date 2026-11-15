import { describe, expect, it } from "vitest";
import {
  getPilotSkinProfile,
  normalizeSelectedPilotSkinId,
  normalizeUnlockedPilotSkinIds
} from "../src/game/pilot-skins";

describe("pilot outfit skins", () => {
  it("includes a standard palette and an unlockable Nebula Veil palette", () => {
    expect(getPilotSkinProfile("standard").unlockCost).toBe(0);
    expect(getPilotSkinProfile("nebula-veil").unlockCost).toBeGreaterThan(0);
    expect(getPilotSkinProfile("nebula-veil").trimColor).not.toBe(getPilotSkinProfile("standard").trimColor);
  });

  it("normalizes unknown, duplicate and unavailable skin selections", () => {
    const unlocked = normalizeUnlockedPilotSkinIds(["nebula-veil", "nebula-veil", "forged"]);
    expect(unlocked).toEqual(["standard", "nebula-veil"]);
    expect(normalizeSelectedPilotSkinId("nebula-veil", unlocked)).toBe("nebula-veil");
    expect(normalizeSelectedPilotSkinId("nebula-veil", ["standard"])).toBe("standard");
    expect(normalizeSelectedPilotSkinId("forged", unlocked)).toBe("standard");
  });
});

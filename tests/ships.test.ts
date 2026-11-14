import { describe, expect, it } from "vitest";
import { createBackup, createDefaultSave, sanitizeSaveData, verifyBackup } from "../src/game/core";
import { getShipProfile, normalizeSelectedShipId, normalizeUnlockedShipIds } from "../src/game/ships";

describe("ship roster and save integration", () => {
  it("defines three distinct ships with bounded, meaningful trade-offs", () => {
    const fast = getShipProfile("Aqua-Comet");
    const heavy = getShipProfile("Rose-Bastion");
    expect(fast.movementMultiplier).toBeGreaterThan(1);
    expect(fast.fireIntervalMultiplier).toBeLessThan(1);
    expect(fast.hullBonus).toBe(0);
    expect(heavy.attackMultiplier).toBeGreaterThan(1);
    expect(heavy.movementMultiplier).toBeLessThan(1);
    expect(heavy.hullBonus).toBeGreaterThan(0);
  });

  it("filters unknown and duplicate ships and always keeps the starter ship", () => {
    expect(normalizeUnlockedShipIds(["Aqua-Comet", "Aqua-Comet", "unknown"])).toEqual([
      "Lumen-01",
      "Aqua-Comet"
    ]);
  });

  it("does not allow selecting an unlocked-looking but unknown or locked ship", () => {
    const unlocked = normalizeUnlockedShipIds(["Lumen-01", "Aqua-Comet"]);
    expect(normalizeSelectedShipId("Aqua-Comet", unlocked)).toBe("Aqua-Comet");
    expect(normalizeSelectedShipId("Rose-Bastion", unlocked)).toBe("Lumen-01");
    expect(normalizeSelectedShipId("forged-ship", unlocked)).toBe("Lumen-01");
  });

  it("keeps the selected ship through a validated backup round trip", () => {
    const save = createDefaultSave();
    save.unlockedShips.push("Aqua-Comet");
    save.selectedShip = "Aqua-Comet";
    const restored = verifyBackup(createBackup(save));
    expect(restored?.unlockedShips).toContain("Aqua-Comet");
    expect(restored?.selectedShip).toBe("Aqua-Comet");
  });

  it("sanitizes forged ship identifiers in local save data", () => {
    const save = createDefaultSave();
    const clean = sanitizeSaveData({
      ...save,
      unlockedShips: ["Lumen-01", "forged-ship"],
      selectedShip: "forged-ship"
    });
    expect(clean.unlockedShips).toEqual(["Lumen-01"]);
    expect(clean.selectedShip).toBe("Lumen-01");
  });
});

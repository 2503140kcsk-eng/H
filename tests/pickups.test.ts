import { describe, expect, it } from "vitest";
import { PICKUP_EFFECTS, selectPickupKind } from "../src/game/pickups";

describe("combat pickup distribution", () => {
  it("selects every documented pickup at its deterministic probability interval", () => {
    expect(selectPickupKind(0)).toBe("shard");
    expect(selectPickupKind(0.3399)).toBe("shard");
    expect(selectPickupKind(0.34)).toBe("repair");
    expect(selectPickupKind(0.48)).toBe("overdrive");
    expect(selectPickupKind(0.64)).toBe("multishot");
    expect(selectPickupKind(0.76)).toBe("shield");
    expect(selectPickupKind(0.88)).toBe("speed");
    expect(selectPickupKind(0.94)).toBe("special");
    expect(selectPickupKind(0.999)).toBe("special");
  });

  it("bounds invalid random input and gives safe deterministic fallback", () => {
    expect(selectPickupKind(Number.NaN)).toBe("shard");
    expect(selectPickupKind(Number.POSITIVE_INFINITY)).toBe("shard");
    expect(selectPickupKind(-1)).toBe("shard");
    expect(selectPickupKind(1)).toBe("special");
  });

  it("keeps all temporary effects and instant restorations finite and bounded", () => {
    expect(PICKUP_EFFECTS.overdriveSeconds).toBeGreaterThan(0);
    expect(PICKUP_EFFECTS.multishotSeconds).toBeGreaterThan(0);
    expect(PICKUP_EFFECTS.speedSeconds).toBeGreaterThan(0);
    expect(PICKUP_EFFECTS.shieldRestore).toBeGreaterThan(0);
    expect(PICKUP_EFFECTS.shieldRestore).toBeLessThanOrEqual(100);
    expect(PICKUP_EFFECTS.specialRestore).toBeGreaterThan(0);
    expect(PICKUP_EFFECTS.specialRestore).toBeLessThanOrEqual(100);
    expect(PICKUP_EFFECTS.shardReward).toBeGreaterThan(0);
  });
});

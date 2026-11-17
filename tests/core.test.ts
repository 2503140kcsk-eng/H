import { describe, expect, it } from "vitest";
import * as coreModule from "../src/game/core";

type CoreApi = {
  clamp(value: number, min: number, max: number): number;
  resolveDamage(hp: number, damage: number): { hp: number; destroyed: boolean };
  upgradeCost(baseCost: number, level: number): number;
  createDefaultSave(): {
    version: number;
    shards: number;
    upgrades: { attack: number; hull: number };
    campaign: { version: number; completedMissionIds: string[] };
  };
  sanitizeSaveData(value: unknown): {
    version: number;
    shards: number;
    upgrades: { attack: number; hull: number };
  };
  createBackup(value: unknown): string;
  verifyBackup(serialized: string): unknown | null;
};

const core = coreModule as unknown as CoreApi;

describe("combat and progression core", () => {
  it("clamps movement values to the playable range", () => {
    expect(typeof core.clamp).toBe("function");
    expect(core.clamp(-3, 0, 10)).toBe(0);
    expect(core.clamp(4, 0, 10)).toBe(4);
    expect(core.clamp(13, 0, 10)).toBe(10);
  });

  it("applies damage without allowing negative hull", () => {
    expect(typeof core.resolveDamage).toBe("function");
    expect(core.resolveDamage(7, 3)).toEqual({ hp: 4, destroyed: false });
    expect(core.resolveDamage(2, 9)).toEqual({ hp: 0, destroyed: true });
    expect(core.resolveDamage(7, -2)).toEqual({ hp: 7, destroyed: false });
  });

  it("makes permanent upgrade costs increase predictably", () => {
    expect(typeof core.upgradeCost).toBe("function");
    expect(core.upgradeCost(100, 0)).toBe(100);
    expect(core.upgradeCost(100, 3)).toBe(372);
    expect(() => core.upgradeCost(-1, 0)).toThrow();
  });

  it("sanitizes hostile save values before they enter progression", () => {
    expect(typeof core.createDefaultSave).toBe("function");
    expect(typeof core.sanitizeSaveData).toBe("function");
    const clean = core.sanitizeSaveData({
      version: 1,
      shards: -500,
      upgrades: { attack: 9000, hull: -9 }
    });
    expect(clean.version).toBe(1);
    expect(clean.shards).toBe(0);
    expect(clean.upgrades).toEqual({ attack: 20, hull: 0 });
    expect(clean.campaign.version).toBe(1);
    expect(clean.campaign.completedMissionIds).toEqual([]);
  });

  it("rejects a tampered backup rather than returning its payload", () => {
    expect(typeof core.createBackup).toBe("function");
    expect(typeof core.verifyBackup).toBe("function");
    const serialized = core.createBackup(core.createDefaultSave());
    expect(core.verifyBackup(serialized)).not.toBeNull();

    const parsed = JSON.parse(serialized) as { payload: { shards: number } };
    parsed.payload.shards += 1;
    expect(core.verifyBackup(JSON.stringify(parsed))).toBeNull();

    const unsupportedVersion = JSON.parse(serialized) as { payload: { version: number } };
    unsupportedVersion.payload.version = 99;
    expect(core.verifyBackup(JSON.stringify(unsupportedVersion))).toBeNull();

    const malformedPayload = JSON.parse(serialized) as { payload: { upgrades: { attack: number } } };
    malformedPayload.payload.upgrades.attack = 999;
    expect(core.verifyBackup(JSON.stringify(malformedPayload))).toBeNull();
  });
});

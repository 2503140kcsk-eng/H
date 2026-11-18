import { describe, expect, it } from "vitest";
import { MAX_PILOT_VRM_BYTES, validateVrmFile } from "../src/game/vrmFile";

function file(name: string, size: number): File {
  return { name, size } as File;
}

describe("local VRM file validation", () => {
  it("accepts a non-empty VRM file and treats the extension case-insensitively", () => {
    expect(validateVrmFile(file("lumi.vrm", 1024))).toEqual({ valid: true });
    expect(validateVrmFile(file("NOA.VRM", 2048))).toEqual({ valid: true });
  });

  it("rejects non-VRM files before attempting to load a model", () => {
    const result = validateVrmFile(file("avatar.glb", 1024));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain(".vrm");
  });

  it("rejects empty files", () => {
    const result = validateVrmFile(file("empty.vrm", 0));
    expect(result.valid).toBe(false);
  });

  it("rejects files larger than the iPhone-safe 32 MiB import limit", () => {
    const result = validateVrmFile(file("oversized.vrm", MAX_PILOT_VRM_BYTES + 1));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("32 MiB");
  });

  it("accepts a file exactly at the configured size limit", () => {
    expect(validateVrmFile(file("limit.vrm", MAX_PILOT_VRM_BYTES))).toEqual({ valid: true });
  });
});

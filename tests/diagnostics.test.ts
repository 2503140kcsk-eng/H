import { describe, expect, it } from "vitest";
import { summarizeFrameTimes, diagnosticsToCsv, getActiveFrameIntervalMs, type DeviceDiagnosticsReport } from "../src/game/diagnostics";

describe("summarizeFrameTimes", () => {
  it("reports average, p95 and estimated FPS from finite positive samples", () => {
    const result = summarizeFrameTimes([16, 18, 20, 40, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]);
    expect(result.sampleCount).toBe(4);
    expect(result.averageFrameTimeMs).toBeCloseTo(23.5);
    expect(result.p95FrameTimeMs).toBe(40);
    expect(result.worstFrameTimeMs).toBe(40);
    expect(result.estimatedFps).toBeCloseTo(1000 / 23.5);
  });

  it("returns null performance values when no valid samples exist", () => {
    expect(summarizeFrameTimes([0, -4, Number.NaN])).toEqual({
      sampleCount: 0,
      averageFrameTimeMs: null,
      p95FrameTimeMs: null,
      worstFrameTimeMs: null,
      estimatedFps: null
    });
  });
});

describe("diagnosticsToCsv", () => {
  it("flattens a diagnostic report into escaped path/value rows", () => {
    const report: DeviceDiagnosticsReport = {
      format: "starlight-wing-diagnostics",
      version: 1,
      capturedAt: "2026-11-15T12:00:00.000Z",
      device: {
        userAgent: 'iPhone "Test", Mobile',
        language: "ja-JP",
        viewport: { width: 844, height: 390 },
        devicePixelRatio: 3,
        touchPoints: 5,
        standalone: false,
        orientation: "landscape"
      },
      capabilities: {
        webgl2: true,
        indexedDB: true,
        serviceWorker: true,
        pointerEvents: true,
        audioContext: true
      },
      storage: {
        persistenceStatus: "persistent",
        estimateUsageBytes: 1024,
        estimateQuotaBytes: 8192,
        persisted: false
      },
      game: null
    };

    const csv = diagnosticsToCsv(report);
    expect(csv).toContain('"device.userAgent","iPhone ""Test"", Mobile"');
    expect(csv).toContain('"device.viewport.width","844"');
    expect(csv.startsWith('"path","value"')).toBe(true);
  });
});


describe("getActiveFrameIntervalMs", () => {
  it("does not count the first animation frame because no previous timestamp exists", () => {
    expect(getActiveFrameIntervalMs(null, 8200, true)).toBeNull();
  });

  it("returns the real interval only while gameplay is active", () => {
    expect(getActiveFrameIntervalMs(8200, 8216.7, true)).toBeCloseTo(16.7);
    expect(getActiveFrameIntervalMs(8200, 8216.7, false)).toBeNull();
  });

  it("rejects non-finite and non-monotonic timestamps", () => {
    expect(getActiveFrameIntervalMs(8200, Number.NaN, true)).toBeNull();
    expect(getActiveFrameIntervalMs(8200, Number.POSITIVE_INFINITY, true)).toBeNull();
    expect(getActiveFrameIntervalMs(8200, 8199, true)).toBeNull();
  });
});

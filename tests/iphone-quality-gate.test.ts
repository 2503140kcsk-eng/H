import { describe, expect, it } from "vitest";
import {
  createDiagnosticCsv,
  evaluateQualityGate,
  summarizeQualityGate,
  type QualityGateSnapshot
} from "../src/diagnostics/iphone-quality-gate";

const healthySnapshot: QualityGateSnapshot = {
  secureContext: true,
  webgl2: true,
  pointerEvents: true,
  maxTouchPoints: 5,
  landscape: true,
  viewportWidth: 844,
  serviceWorkerSupported: true,
  serviceWorkerRegistered: true,
  manifestPresent: true,
  persistence: "persistent",
  audioState: "running",
  contextLostCount: 1,
  contextRestoredCount: 1,
  pointerDownCount: 3,
  pointerUpCount: 3,
  lifecycleTransitions: 2
};

describe("Q-TRACE iPhone Quality Gate", () => {
  it("recognizes a fully observed iPhone-ready browser profile", () => {
    const checks = evaluateQualityGate(healthySnapshot);
    expect(checks.every((check) => check.status === "pass")).toBe(true);
    expect(summarizeQualityGate(checks)).toMatchObject({
      score: 100,
      blockingFailures: 0,
      warnings: 0,
      manualPending: 0,
      disposition: "ready"
    });
  });

  it("blocks insecure origins and missing WebGL2 rather than claiming readiness", () => {
    const checks = evaluateQualityGate({
      ...healthySnapshot,
      secureContext: false,
      webgl2: false
    });
    expect(checks.find((check) => check.id === "secure-context")?.status).toBe("fail");
    expect(checks.find((check) => check.id === "webgl2")?.status).toBe("fail");
    expect(summarizeQualityGate(checks).disposition).toBe("blocked");
  });

  it("keeps non-touch desktop environments as warnings instead of false iPhone passes", () => {
    const checks = evaluateQualityGate({ ...healthySnapshot, maxTouchPoints: 0 });
    expect(checks.find((check) => check.id === "touch-capability")?.status).toBe("warn");
    expect(summarizeQualityGate(checks).disposition).toBe("device-check-required");
  });

  it("distinguishes an unobserved WebGL restore from a failed restore", () => {
    const unobserved = evaluateQualityGate({
      ...healthySnapshot,
      contextLostCount: 0,
      contextRestoredCount: 0
    });
    const failed = evaluateQualityGate({
      ...healthySnapshot,
      contextLostCount: 2,
      contextRestoredCount: 1
    });
    expect(unobserved.find((check) => check.id === "webgl-recovery")?.status).toBe("manual");
    expect(failed.find((check) => check.id === "webgl-recovery")?.status).toBe("fail");
  });

  it("does not certify pointer input until a down/up sequence was observed", () => {
    const checks = evaluateQualityGate({
      ...healthySnapshot,
      pointerDownCount: 0,
      pointerUpCount: 0
    });
    expect(checks.find((check) => check.id === "game-canvas-pointer")?.status).toBe("manual");
  });

  it("uses an auditable CSV header and escapes commas, quotes, and line breaks", () => {
    const csv = createDiagnosticCsv({
      schema: "starlight-wing-q-trace",
      version: 1,
      generatedAt: "2026-11-15T00:00:00.000Z",
      summary: { score: 80, blockingFailures: 0, warnings: 1, manualPending: 1, disposition: "device-check-required" },
      checks: [{
        id: "audio-state",
        category: "audio",
        status: "warn",
        title: "Audio state",
        detail: 'suspended, "gesture" required',
        action: "Tap to resume"
      }],
      manualChecks: [{ id: "touch-drag", label: "Touch drag", verified: false }],
      environment: { userAgent: "QA, device" }
    });
    expect(csv).toContain("id,category,status,title,detail,action");
    expect(csv).toContain('"suspended, ""gesture"" required"');
    expect(csv).toContain('"QA, device"');
  });
});

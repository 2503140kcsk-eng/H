import { describe, expect, it } from "vitest";
import {
  assessEvasion,
  createAttackForecast,
  forecastPaths,
  type ThreatPath
} from "../src/game/threatForecast";

describe("deterministic attack forecasts", () => {
  it("locks an aimed attack to a normalized target snapshot", () => {
    const forecast = createAttackForecast({
      origin: { x: 0, y: 5 },
      target: { x: 3, y: 1 },
      pattern: "aimed",
      projectileSpeed: 6
    });
    expect(forecast.direction.x).toBeCloseTo(0.6);
    expect(forecast.direction.y).toBeCloseTo(-0.8);
    expect(forecastPaths(forecast)).toHaveLength(1);
    expect(forecastPaths(forecast)[0].velocity.x).toBeCloseTo(3.6);
    expect(forecastPaths(forecast)[0].velocity.y).toBeCloseTo(-4.8);
  });

  it("creates a symmetric, reproducible fan preview", () => {
    const forecast = createAttackForecast({
      origin: { x: 0, y: 4 },
      target: { x: 0, y: 0 },
      pattern: "spread",
      projectileSpeed: 5,
      projectileCount: 5,
      spreadRadians: 0.2
    });
    const first = forecastPaths(forecast);
    const second = forecastPaths(forecast);
    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first[0].velocity.x).toBeCloseTo(-first[4].velocity.x);
    expect(first[0].velocity.y).toBeCloseTo(first[4].velocity.y);
    expect(first[2].velocity.x).toBeCloseTo(forecast.direction.x * 5);
    expect(first[2].velocity.y).toBeCloseTo(forecast.direction.y * 5);
  });

  it("bounds malformed inputs and handles a zero-length aim vector", () => {
    const forecast = createAttackForecast({
      origin: { x: Number.NaN, y: Infinity },
      target: { x: 0, y: 0 },
      pattern: "homing",
      projectileSpeed: Number.NaN,
      projectileCount: 999,
      spreadRadians: -10,
      projectileRadius: -1
    });
    expect(forecast.origin).toEqual({ x: 0, y: 0 });
    expect(forecast.direction).toEqual({ x: 0, y: 1 });
    expect(forecast.projectileSpeed).toBe(5);
    expect(forecast.projectileCount).toBe(9);
    expect(forecast.spreadRadians).toBe(0);
    expect(forecast.projectileRadius).toBe(0.01);
    expect(forecastPaths(forecast)).toHaveLength(1);
  });
});

describe("evasion scoring", () => {
  const bounds = { minX: -8, maxX: 8, minY: -6, maxY: 6 };

  it("recommends leaving a predicted collision lane", () => {
    const bullet: ThreatPath = {
      position: { x: 0, y: 2.5 },
      velocity: { x: 0, y: -5 },
      radius: 0.18,
      source: "projectile"
    };
    const result = assessEvasion(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      [bullet],
      bounds,
      { candidateSpeed: 4.5, horizonSeconds: 1 }
    );
    expect(result.risk).toBe("danger");
    expect(["left", "right", "up", "down"]).toContain(result.recommended);
    expect(result.recommendedClearance).toBeGreaterThan(result.currentClearance);
  });

  it("does not treat a warning path as active before its release delay", () => {
    const warning: ThreatPath = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: -5 },
      radius: 0.2,
      source: "forecast",
      startDelaySeconds: 1
    };
    const result = assessEvasion(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      [warning],
      bounds,
      { horizonSeconds: 0.8 }
    );
    expect(result.risk).toBe("clear");
    expect(result.recommended).toBe("hold");
    expect(result.confidence).toBe(0);
  });

  it("checks the launch point at release, not a projectile that moved during wind-up", () => {
    const warning: ThreatPath = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: -5 },
      radius: 0.2,
      source: "forecast",
      startDelaySeconds: 0.5
    };
    const result = assessEvasion(
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      [warning],
      bounds,
      { horizonSeconds: 1 }
    );
    expect(result.risk).toBe("danger");
  });

  it("evaluates a dodge as a deliberate change of movement direction", () => {
    const crossing: ThreatPath = {
      position: { x: 2.5, y: 0 },
      velocity: { x: -5, y: 0 },
      radius: 0.18,
      source: "projectile"
    };
    const result = assessEvasion(
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      [crossing],
      bounds,
      { candidateSpeed: 4.5, horizonSeconds: 1 }
    );
    expect(result.recommended).not.toBe("hold");
    expect(result.recommendedClearance).toBeGreaterThan(result.currentClearance);
  });

  it("returns hold when no hostile paths are present", () => {
    const result = assessEvasion({ x: 0, y: 0 }, { x: 0, y: 0 }, [], bounds);
    expect(result.risk).toBe("clear");
    expect(result.recommended).toBe("hold");
    expect(result.confidence).toBe(0);
  });

  it("prefers an in-bounds candidate when the direct route is dangerous", () => {
    const bullet: ThreatPath = {
      position: { x: 0, y: 2 },
      velocity: { x: 0, y: -4 },
      radius: 0.2,
      source: "forecast"
    };
    const result = assessEvasion(
      { x: 7.8, y: 0 },
      { x: 0, y: 0 },
      [bullet],
      { minX: -8, maxX: 8, minY: -6, maxY: 6 },
      { candidateSpeed: 6, horizonSeconds: 1.2 }
    );
    expect(result.candidates.find((candidate) => candidate.direction === "right")?.clearance)
      .toBeLessThan(result.candidates.find((candidate) => candidate.direction === "left")?.clearance ?? -Infinity);
  });
});

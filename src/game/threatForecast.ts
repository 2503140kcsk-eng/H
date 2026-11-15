export type Vector2Like = { readonly x: number; readonly y: number };

export type AttackPattern = "aimed" | "spread" | "homing";
export type DodgeDirection = "hold" | "left" | "right" | "up" | "down";
export type ThreatRisk = "clear" | "watch" | "danger";

export interface AttackForecastInput {
  readonly origin: Vector2Like;
  readonly target: Vector2Like;
  readonly pattern: AttackPattern;
  readonly projectileSpeed: number;
  readonly projectileCount?: number;
  readonly spreadRadians?: number;
  readonly projectileRadius?: number;
}

export interface AttackForecast {
  readonly pattern: AttackPattern;
  readonly origin: Vector2Like;
  readonly direction: Vector2Like;
  readonly projectileSpeed: number;
  readonly projectileCount: number;
  readonly spreadRadians: number;
  readonly projectileRadius: number;
}

export interface ThreatPath {
  readonly position: Vector2Like;
  readonly velocity: Vector2Like;
  readonly radius: number;
  readonly source: "forecast" | "projectile";
}

export interface EvasionBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface EvasionOptions {
  readonly horizonSeconds?: number;
  readonly candidateSpeed?: number;
  readonly playerRadius?: number;
}

export interface DodgeCandidateScore {
  readonly direction: DodgeDirection;
  readonly clearance: number;
}

export interface EvasionAssessment {
  /** Risk if the player keeps the current velocity. */
  readonly risk: ThreatRisk;
  readonly recommended: DodgeDirection;
  readonly currentClearance: number;
  readonly recommendedClearance: number;
  readonly confidence: number;
  readonly candidates: readonly DodgeCandidateScore[];
}

const EPSILON = 1e-8;
const MAX_PROJECTILES = 9;

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(vector: Vector2Like): Vector2Like {
  const x = finite(vector.x, 0);
  const y = finite(vector.y, 0);
  const length = Math.hypot(x, y);
  return length > EPSILON ? { x: x / length, y: y / length } : { x: 0, y: 1 };
}

function rotate(vector: Vector2Like, angle: number): Vector2Like {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine
  };
}

/**
 * Locks an attack to a target snapshot. The resulting paths are deterministic:
 * movement after the warning begins cannot silently retarget an aimed attack.
 */
export function createAttackForecast(input: AttackForecastInput): AttackForecast {
  const dx = finite(input.target.x, 0) - finite(input.origin.x, 0);
  const dy = finite(input.target.y, 0) - finite(input.origin.y, 0);
  const direction = normalize({ x: dx, y: dy });
  const defaultCount = input.pattern === "spread" ? 5 : 1;

  return {
    pattern: input.pattern,
    origin: { x: finite(input.origin.x, 0), y: finite(input.origin.y, 0) },
    direction,
    projectileSpeed: clamp(finite(input.projectileSpeed, 5), 0.1, 30),
    projectileCount: Math.floor(clamp(finite(input.projectileCount ?? defaultCount, defaultCount), 1, MAX_PROJECTILES)),
    spreadRadians: clamp(finite(input.spreadRadians ?? 0.24, 0.24), 0, 1.2),
    projectileRadius: clamp(finite(input.projectileRadius ?? 0.19, 0.19), 0.01, 2)
  };
}

/** Converts a warning into the exact projectile centre-lines used at release. */
export function forecastPaths(forecast: AttackForecast): ThreatPath[] {
  const paths: ThreatPath[] = [];
  const count = forecast.pattern === "spread" ? forecast.projectileCount : 1;
  const origin = { ...forecast.origin };

  for (let index = 0; index < count; index += 1) {
    const offset = count === 1
      ? 0
      : (index - (count - 1) / 2) * forecast.spreadRadians;
    const direction = rotate(forecast.direction, offset);
    paths.push({
      position: origin,
      velocity: {
        x: direction.x * forecast.projectileSpeed,
        y: direction.y * forecast.projectileSpeed
      },
      radius: forecast.projectileRadius,
      source: "forecast"
    });
  }

  return paths;
}

function closestClearance(
  playerPosition: Vector2Like,
  playerVelocity: Vector2Like,
  threats: readonly ThreatPath[],
  horizon: number,
  playerRadius: number
): number {
  if (threats.length === 0) return Number.POSITIVE_INFINITY;
  let minimum = Number.POSITIVE_INFINITY;

  for (const threat of threats) {
    const relativeX = finite(threat.position.x, 0) - playerPosition.x;
    const relativeY = finite(threat.position.y, 0) - playerPosition.y;
    const relativeVelocityX = finite(threat.velocity.x, 0) - playerVelocity.x;
    const relativeVelocityY = finite(threat.velocity.y, 0) - playerVelocity.y;
    const speedSquared = relativeVelocityX ** 2 + relativeVelocityY ** 2;
    const closestTime = speedSquared > EPSILON
      ? clamp(
          -(relativeX * relativeVelocityX + relativeY * relativeVelocityY) / speedSquared,
          0,
          horizon
        )
      : 0;
    const distance = Math.hypot(
      relativeX + relativeVelocityX * closestTime,
      relativeY + relativeVelocityY * closestTime
    );
    const clearance = distance - playerRadius - clamp(finite(threat.radius, 0), 0, 2);
    minimum = Math.min(minimum, clearance);
  }

  return minimum;
}

/**
 * Compares five human-readable movement choices by their minimum predicted
 * clearance from all forecast and already-active hostile projectiles.
 * This is advisory only; it never moves the player automatically.
 */
export function assessEvasion(
  playerPosition: Vector2Like,
  playerVelocity: Vector2Like,
  threats: readonly ThreatPath[],
  bounds: EvasionBounds,
  options: EvasionOptions = {}
): EvasionAssessment {
  const horizon = clamp(finite(options.horizonSeconds ?? 1.35, 1.35), 0.1, 4);
  const candidateSpeed = clamp(finite(options.candidateSpeed ?? 5, 5), 0, 15);
  const playerRadius = clamp(finite(options.playerRadius ?? 0.42, 0.42), 0.05, 2);
  const baseVelocity = { x: finite(playerVelocity.x, 0), y: finite(playerVelocity.y, 0) };
  const directions: ReadonlyArray<{ direction: DodgeDirection; x: number; y: number }> = [
    { direction: "hold", x: 0, y: 0 },
    { direction: "left", x: -1, y: 0 },
    { direction: "right", x: 1, y: 0 },
    { direction: "up", x: 0, y: 1 },
    { direction: "down", x: 0, y: -1 }
  ];

  const score = directions.map((candidate): DodgeCandidateScore => {
    const velocity = {
      x: baseVelocity.x + candidate.x * candidateSpeed,
      y: baseVelocity.y + candidate.y * candidateSpeed
    };
    const clearance = closestClearance(playerPosition, velocity, threats, horizon, playerRadius);
    const endX = playerPosition.x + velocity.x * horizon;
    const endY = playerPosition.y + velocity.y * horizon;
    const boundsPenalty = (
      Math.max(0, bounds.minX - endX, endX - bounds.maxX) +
      Math.max(0, bounds.minY - endY, endY - bounds.maxY)
    ) * 2;
    return { direction: candidate.direction, clearance: clearance - boundsPenalty };
  });

  const currentClearance = closestClearance(playerPosition, baseVelocity, threats, horizon, playerRadius);
  const best = score.reduce((selected, candidate) =>
    candidate.clearance > selected.clearance ? candidate : selected
  );
  const risk: ThreatRisk = currentClearance <= 0.2
    ? "danger"
    : currentClearance <= 1.15
      ? "watch"
      : "clear";
  const recommendationIsUseful = risk !== "clear" &&
    best.direction !== "hold" &&
    best.clearance > score[0].clearance + 0.08;
  const recommended = recommendationIsUseful ? best.direction : "hold";
  const confidence = threats.length === 0
    ? 0
    : clamp(Math.abs(best.clearance - currentClearance) / 2.5, 0, 1);

  return {
    risk,
    recommended,
    currentClearance,
    recommendedClearance: best.clearance,
    confidence,
    candidates: score
  };
}

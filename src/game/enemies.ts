export type EnemyKind =
  | "scout"
  | "interceptor"
  | "heavy"
  | "sniper"
  | "bomber"
  | "missile"
  | "guardian"
  | "swarm"
  | "elite";

export type EnemyMovement = "sway" | "zigzag" | "steady" | "sniper" | "guard" | "strafe";
export type EnemyAttack = "aimed" | "spread" | "homing" | "triple" | "none";
export type EnemyShape =
  | "cone"
  | "octahedron"
  | "box"
  | "needle"
  | "bomber"
  | "dart"
  | "orb"
  | "swarm"
  | "elite";

export interface EnemyProfile {
  readonly health: number;
  readonly speed: number;
  readonly radius: number;
  readonly fireInterval: number;
  readonly score: number;
  readonly shards: number;
  readonly unlockAt: number;
  readonly shape: EnemyShape;
  readonly movement: EnemyMovement;
  readonly attack: EnemyAttack;
  readonly shield: number;
}

export const ENEMY_PROFILES = {
  scout: {
    health: 3, speed: 2.8, radius: 0.48, fireInterval: 1.65, score: 100, shards: 1,
    unlockAt: 0, shape: "cone", movement: "sway", attack: "aimed", shield: 0
  },
  interceptor: {
    health: 2, speed: 4.4, radius: 0.48, fireInterval: 2.15, score: 140, shards: 2,
    unlockAt: 0, shape: "octahedron", movement: "zigzag", attack: "aimed", shield: 0
  },
  heavy: {
    health: 7, speed: 1.65, radius: 0.72, fireInterval: 1.55, score: 240, shards: 4,
    unlockAt: 0, shape: "box", movement: "steady", attack: "spread", shield: 0
  },
  sniper: {
    health: 3, speed: 1.55, radius: 0.5, fireInterval: 2.65, score: 180, shards: 3,
    unlockAt: 5, shape: "needle", movement: "sniper", attack: "aimed", shield: 0
  },
  bomber: {
    health: 5, speed: 1.4, radius: 0.64, fireInterval: 2.8, score: 210, shards: 4,
    unlockAt: 10, shape: "bomber", movement: "sway", attack: "spread", shield: 0
  },
  missile: {
    health: 2, speed: 3.6, radius: 0.42, fireInterval: 3.4, score: 190, shards: 4,
    unlockAt: 14, shape: "dart", movement: "zigzag", attack: "homing", shield: 0
  },
  guardian: {
    health: 6, speed: 1.4, radius: 0.66, fireInterval: 2.35, score: 260, shards: 5,
    unlockAt: 18, shape: "orb", movement: "guard", attack: "aimed", shield: 4
  },
  swarm: {
    health: 1, speed: 5.6, radius: 0.26, fireInterval: 4.2, score: 75, shards: 1,
    unlockAt: 22, shape: "swarm", movement: "zigzag", attack: "none", shield: 0
  },
  elite: {
    health: 9, speed: 2.2, radius: 0.78, fireInterval: 1.8, score: 360, shards: 8,
    unlockAt: 28, shape: "elite", movement: "strafe", attack: "triple", shield: 2
  }
} satisfies Record<EnemyKind, EnemyProfile>;

const ENEMY_ORDER = Object.keys(ENEMY_PROFILES) as EnemyKind[];

export function getUnlockedEnemyKinds(elapsed: number): EnemyKind[] {
  const seconds = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return ENEMY_ORDER.filter((kind) => ENEMY_PROFILES[kind].unlockAt <= seconds);
}

export function selectEnemyKind(elapsed: number, roll: number): EnemyKind {
  const available = getUnlockedEnemyKinds(elapsed);
  const normalized = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0;
  const index = Math.min(available.length - 1, Math.floor(normalized * available.length));
  return available[index] ?? "scout";
}

export function absorbGuardianShield(shield: number, damage: number): {
  remainingShield: number;
  remainingDamage: number;
} {
  const safeShield = Number.isFinite(shield) ? Math.max(0, shield) : 0;
  const safeDamage = Number.isFinite(damage) ? Math.max(0, damage) : 0;
  const absorbed = Math.min(safeShield, safeDamage);
  return {
    remainingShield: safeShield - absorbed,
    remainingDamage: safeDamage - absorbed
  };
}

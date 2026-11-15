export type BodyArchetype = "fighter" | "armored" | "guardian" | "boss";
export type BodyPartId = "leftWing" | "rightWing" | "weapon" | "shieldEmitter" | "core";

export interface BodyPartState {
  readonly hp: number;
  readonly maxHp: number;
  readonly destroyed: boolean;
}

export interface BodyIntegrity {
  readonly archetype: BodyArchetype;
  readonly parts: Readonly<Partial<Record<BodyPartId, BodyPartState>>>;
}

export interface BodyIntegrityEffects {
  readonly canAttack: boolean;
  readonly shieldActive: boolean;
  readonly lateralMovementMultiplier: number;
  readonly coreDamageMultiplier: number;
  readonly leftVolleyEnabled: boolean;
  readonly rightVolleyEnabled: boolean;
}

export interface BodyDamageResult {
  readonly integrity: BodyIntegrity;
  readonly damaged: boolean;
  readonly newlyDestroyed: boolean;
  readonly remainingHp: number;
}

const PART_HP: Readonly<Record<BodyArchetype, Partial<Record<BodyPartId, number>>>> = {
  fighter: { leftWing: 2, rightWing: 2, weapon: 2.5, core: 4 },
  armored: { leftWing: 3, rightWing: 3, weapon: 3, shieldEmitter: 2.5, core: 5 },
  guardian: { weapon: 3, shieldEmitter: 3, core: 5 },
  boss: { leftWing: 15, rightWing: 15, weapon: 12, shieldEmitter: 10, core: 22 }
};

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function createBodyIntegrity(archetype: BodyArchetype): BodyIntegrity {
  const parts: Partial<Record<BodyPartId, BodyPartState>> = {};
  for (const [partId, hp] of Object.entries(PART_HP[archetype]) as Array<[BodyPartId, number]>) {
    parts[partId] = { hp, maxHp: hp, destroyed: false };
  }
  return { archetype, parts };
}

/**
 * Maps a projectile impact in target-local coordinates to a named module.
 * Coordinates are normalized by the target's collision radius.
 */
export function selectImpactPart(
  integrity: BodyIntegrity,
  localX: number,
  localY: number,
  bodyRadius: number
): BodyPartId {
  const x = finiteNonNegative(Math.abs(localX)) / Math.max(0.05, finiteNonNegative(bodyRadius));
  const y = (Number.isFinite(localY) ? localY : 0) / Math.max(0.05, finiteNonNegative(bodyRadius));
  const available = integrity.parts;

  const intact = (id: BodyPartId): boolean => Boolean(available[id] && !available[id]?.destroyed);
  if (intact("core") && x <= 0.22 && y >= -0.12 && y <= 0.48) return "core";
  if (localX < 0 && x >= 0.34 && intact("leftWing")) return "leftWing";
  if (localX > 0 && x >= 0.34 && intact("rightWing")) return "rightWing";
  if (intact("shieldEmitter") && x <= 0.38 && y > 0.48) return "shieldEmitter";
  if (intact("weapon") && y < -0.28) return "weapon";

  const priority: BodyPartId[] = ["core", "weapon", "shieldEmitter", "leftWing", "rightWing"];
  return priority.find((id) => available[id] && !available[id]?.destroyed)
    ?? priority.find((id) => available[id])
    ?? "core";
}

/** Applies bounded damage immutably; a destroyed module cannot be damaged again. */
export function damageBodyPart(
  integrity: BodyIntegrity,
  partId: BodyPartId,
  rawDamage: number
): BodyDamageResult {
  const current = integrity.parts[partId];
  if (!current || current.destroyed) {
    return {
      integrity,
      damaged: false,
      newlyDestroyed: false,
      remainingHp: current?.hp ?? 0
    };
  }

  const damage = finiteNonNegative(rawDamage);
  if (damage === 0) {
    return { integrity, damaged: false, newlyDestroyed: false, remainingHp: current.hp };
  }

  const hp = Math.max(0, current.hp - damage);
  const destroyed = hp <= 0;
  const parts = {
    ...integrity.parts,
    [partId]: { ...current, hp, destroyed }
  };
  return {
    integrity: { ...integrity, parts },
    damaged: hp < current.hp,
    newlyDestroyed: destroyed,
    remainingHp: hp
  };
}

/** Converts module integrity into combat rules without coupling to Three.js. */
export function getBodyIntegrityEffects(integrity: BodyIntegrity): BodyIntegrityEffects {
  const parts = integrity.parts;
  const broken = (id: BodyPartId): boolean => Boolean(parts[id]?.destroyed);
  const hasLeftWing = Boolean(parts.leftWing);
  const hasRightWing = Boolean(parts.rightWing);
  const oneWingLost = broken("leftWing") !== broken("rightWing");
  const bothWingsLost = broken("leftWing") && broken("rightWing");
  const core = parts.core;
  const coreExposed = Boolean(core && core.hp < core.maxHp);

  return {
    canAttack: !broken("weapon"),
    shieldActive: !broken("shieldEmitter"),
    lateralMovementMultiplier: bothWingsLost ? 0.38 : oneWingLost ? 0.68 : 1,
    coreDamageMultiplier: coreExposed ? 1.3 : 1,
    leftVolleyEnabled: !hasLeftWing || !broken("leftWing"),
    rightVolleyEnabled: !hasRightWing || !broken("rightWing")
  };
}

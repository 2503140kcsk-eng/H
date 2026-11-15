export type BossPhase = 1 | 2 | 3;

export interface BossPartState {
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

export function getBossPhase(hp: number, maxHp: number): BossPhase {
  if (!Number.isFinite(maxHp) || maxHp <= 0) return 1;
  const ratio = Math.max(0, Math.min(1, Number.isFinite(hp) ? hp / maxHp : 1));
  return ratio <= 0.25 ? 3 : ratio <= 0.5 ? 2 : 1;
}

export function isBossWeakpointOpen(age: number, phase: BossPhase, entering: boolean): boolean {
  if (entering || !Number.isFinite(age) || age < 0) return false;
  const period = phase === 1 ? 7 : phase === 2 ? 5.8 : 4.8;
  const duration = phase === 1 ? 2.2 : phase === 2 ? 1.9 : 1.45;
  return age % period < duration;
}

export function getBossAttackInterval(phase: BossPhase): number {
  return phase === 1 ? 1.5 : phase === 2 ? 0.95 : 0.68;
}

export function getBossVolleyCount(phase: BossPhase): number {
  return phase === 1 ? 3 : phase === 2 ? 7 : 11;
}

export function applyBossPartDamage(part: BossPartState, damage: number): BossPartState {
  if (part.destroyed || !Number.isFinite(damage) || damage <= 0) return { ...part };
  const maxHp = Number.isFinite(part.maxHp) ? Math.max(1, part.maxHp) : 1;
  const hp = Math.max(0, Math.min(maxHp, part.hp) - damage);
  return { hp, maxHp, destroyed: hp <= 0 };
}

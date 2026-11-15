# Starlight Wing — Planetary Combat Expansion Specification

## Product rules

- Primary target remains landscape iPhone Safari/Brave as a static PWA.
- Player state remains local-first. No login, online leaderboard, remote analytics or paid service is required.
- The existing save format stays at version 1; additions are optional on import and defaulted by sanitization.
- Content is original/procedural. External asset packs are not imported without file-level license review.

## Combat

Two weapon slots are persisted. During a sortie, a dedicated HUD control swaps the active slot without pausing movement.

| Weapon | Primary behavior | Trade-off |
|---|---|---|
| Photon Pulse | Straight auto-fire | Baseline |
| Prism Laser | Fast, elongated beam projectile | Slower firing cadence |
| Comet Homing | Guided projectile toward nearest live target | Slow firing cadence |
| Nova Piercer | Projectile passes through two targets | Slow firing cadence |

Boss weakness damage only receives a multiplier while the boss core is exposed. Piercing projectiles retain a per-projectile boss-hit guard so a projectile cannot inflict damage every render frame.

## Pilots

Each of three pilots has:
- a profile-specific special-skill response,
- personal story copy and planet-specific briefing line,
- profile-specific avatar idle animation,
- flight animation style for wing motion and cockpit glow.

This iteration does not claim full-body character animation, voice acting or a multi-node skill tree.

## Planet progression and bosses

- Planet order: Aurora Prime → Pyra Reach → Noctis Archive.
- Only the first planet is initially available. A story clear adds that planet to the completion set and unlocks the next.
- Completion normalization preserves only a contiguous prefix of the campaign.
- Each planet configures background/fog, text briefing, boss profile, weakpoint multiplier, shard reward, score reward and attack pattern.
- Weakpoint cycle: a 2.2-second exposure in each 7-second boss-age cycle after entry.
- Boss attack patterns: aimed fan, homing missiles, and phase-two crossfire.
- Endless mode cycles boss profiles independently of planet progression.

## Planet event loop and radio

- The selected planet schedules one mid-sortie event before the first standard boss arrival.
- Aurora Prime's Starlight Resonance grants a temporary 1.28x player projectile damage multiplier.
- Pyra Reach's Gravity Shear accelerates enemy projectile travel by 1.28x for its active window.
- Noctis Archive's Archive Ward clears active hostile projectiles and maintains a temporary shield.
- Every event has pilot-specific dialogue and a bounded duration. Surviving the event grants 650 score and 12 shards.
- A queued radio panel displays speaker/message lines without covering the boss meter or touch action controls.

## Presentation

- Procedural Web Audio melody and cues are original synthesized notes, not prerecorded music.
- Normal and boss sequences differ; encounter state changes the sequence.
- Hit and destruction use bounded particles; high-impact events trigger short camera shake.
- Audio failure or unavailable AudioContext must not block combat.

## Meta progression

- Achievements are derived from validated sortie/campaign state; they are never granted solely from display UI.
- Boss archive contains bosses actually defeated.
- Local ranking stores the top 10 scores on this device; it is not a global leaderboard.
- JSON backup preserves weapon slots, campaign state, achievements, archive and scores.

## Failure and migration handling

- Unknown weapon, planet, pilot and boss IDs are filtered or replaced with safe defaults.
- Old v1 backups are accepted with new properties defaulted.
- A transferred save is imported only after file-size, envelope, checksum and schema validation, then stored transactionally with a recovery snapshot.
- Checksum detects accidental corruption only; it is not a security signature.

## Performance budget

The new systems do not add physics or postprocessing dependencies. Projectile count remains capped by the current arena limit, particle count remains bounded, and new weapon geometries are shared/disposed with the scene. Physical iPhone FPS and temperature remain manual acceptance checks.

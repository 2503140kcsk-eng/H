# Vector Echo — Combat Intent, Evasion and Structural Damage

Status: implementation foundation on `feature/starlight-wing-mvp`  
Scope: additive combat systems for Starlight Wing; no external service or paid asset is required.

## 1. Design thesis

Vector Echo makes danger legible without making combat harmless. Every telegraphed attack has a deterministic target snapshot and a forecastable set of projectile centre-lines. The player can read and respond to those paths; the game never silently moves the player for them.

The three systems are separately testable:

1. **Threat forecast** owns attack intent, normalized trajectories and immutable target snapshots.
2. **Evasion assessment** consumes trajectories and player movement candidates, compares their minimum predicted clearance and returns advice only.
3. **Body integrity** owns named part HP and maps destroyed modules to combat capabilities. It does not know about Three.js or the HUD.

The integration contract is one-way data flow:

`Enemy / Boss state → AttackForecast → ThreatPath[] → EvasionAssessment → HUD cue`

`Projectile impact → BodyIntegrity → BodyIntegrityEffects → Enemy / Boss behavior`

The modules do not import `Game.ts`, Three.js, DOM, Dexie, or the persistence layer.

## 2. Telegraph contract

An attack warning locks the target position at the start of its wind-up. Re-aiming on the release frame is forbidden for aimed attacks: otherwise the warning would be deceptive rather than predictive. Each forecast path carries the remaining wind-up delay; closest-approach evaluation begins the projectile motion at that future release time, rather than treating the warning as an already-active bullet. The released projectile uses the same locked origin and velocity as the preview.

Supported forecast patterns:

- `aimed`: one line through the locked target snapshot.
- `spread`: symmetric lanes around the locked direction.
- `homing`: the initial warning shows its launch direction; the active projectile may subsequently steer, so its preview is explicitly an initial-trajectory estimate, not a guaranteed future path.

Projectile count, speed, radius and spread are clamped at the module boundary. The forecast uses bounded values and returns new data rather than mutating caller-owned vectors.

## 3. Evasion assessment

The assessment evaluates five candidate controls: hold, left, right, up and down. For each hostile path, it computes closest approach over a bounded horizon using relative position and relative velocity. Clearance is minimum centre distance minus the combined collision radii; arena-boundary excursions incur a penalty.

The result reports:

- current risk (`clear`, `watch`, `danger`) if current movement is maintained;
- movement-direction candidates as deliberate redirections, rather than adding a dodge vector to an old drag velocity;
- the highest-clearance candidate, only when it materially improves safety;
- current and recommended clearance, plus a conservative confidence value.

This is advisory. It does not issue input events, change player coordinates, guarantee survival, or claim perfect interception prediction. Homing projectiles and future enemy movement remain model uncertainty.

## 4. Body integrity

Named modules are independently damaged and are idempotently disabled once destroyed:

| Module | Intended gameplay consequence |
|---|---|
| Left / right wing | Loss of lateral control and removal of the corresponding boss volley side |
| Weapon | Stops future attacks from that target |
| Shield emitter | Deactivates the target's shield |
| Core | A damaged core becomes exposed and increases incoming damage |

Part hit selection is based on target-local impact coordinates normalized by collision radius. World-space projectile impact vectors are inverse-rotated and inverse-scaled before the hit-zone function is called. This gives the game a compact deterministic hit-zone function while avoiding a heavyweight physics dependency.

## 5. Balance and fairness constraints

- A forecast must correspond to the attack actually released.
- A destroyed weapon cannot continue firing from a stale timer.
- Broken parts cannot receive further part damage or trigger their break effect twice.
- A single wing loss must not immobilize an enemy; it changes behavior, not agency.
- A core multiplier is bounded and applies only after the core has sustained damage.
- Enemy projectile count remains subject to the existing global projectile cap.
- A broken weapon cancels its pending forecast immediately.
- Boss volley paths are filtered by the same surviving wing modules during preview, evasion scoring and release; destroyed-wing paths must not remain ghost threats.
- Telegraphs and visual damage states must reuse bounded Three.js resources and be disposed with their owner.
- No online prediction, analytics upload, account, or cloud database is needed.

## 6. Validation plan

Unit tests cover deterministic aim snapshots, symmetric fan geometry, malformed numeric inputs, no-threat behavior, collision-lane avoidance, boundary-aware choices, impact-zone routing, immutable damage, and module consequences.

The next integration gate must additionally prove:

1. released enemy shots use the same locked forecast that was displayed;
2. destroying a weapon suppresses the next attack;
3. breaking one boss wing removes only that side of its volley;
4. the HUD cue is never represented as automatic movement;
5. the 110-projectile cap, memory cleanup and iPhone frame-time budget remain intact;
6. existing save data remains version 1 and requires no migration for transient combat state.

## 7. Originality statement

Vector Echo is an original game-specific synthesis for this project: deterministic intent telegraphs, clearance-based human-readable dodge advice, and subsystem destruction are joined by an explicit data contract. This is not a claim that each constituent idea has never appeared in another game.

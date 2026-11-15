# Starlight Wing — Pilot Immersion & Boss Evolution

Date: 2026-11-15  
Target branch: `feat/pilot-immersion-boss-evolution`  
Parent: `feat/planetary-combat-expansion`

## Product and device constraints

- Landscape iPhone Safari / Brave remains the primary target.
- Keep the game static, local-first and usable without an account or paid backend.
- Do not claim physical-device acceptance from Playwright or desktop browser results.
- The user owns and supplies any optional VRM/GLB file. Never upload it or bundle unreviewed external character/audio assets.
- Preserve save envelope version 1. New backup properties are optional and defaulted when older v1 payloads are imported.

## Pilot presentation

- The hangar displays an original low-poly full-body procedural pilot if no model file is supplied.
- Optional local `.vrm` / `.glb` import is capped at 18 MB. Parsing happens in the browser; no asset upload endpoint exists.
- The showcase uses a dedicated low-power WebGL renderer, DPR 1.0 and a 30 FPS render cap. It is destroyed before a combat renderer is created, preventing two continuously running WebGL contexts.
- Pilot identity changes the palette/accessory set and idle-animation profile.
- Imported VRMs receive an `aa` expression value while speech is active; the procedural fallback animates its mouth mesh.

## Voice and lip movement

- Use the browser's built-in `SpeechSynthesisUtterance` with Japanese locale when available.
- The menu displays the line as text independently of audio support.
- Mouth motion is a simple speaking envelope, not phoneme timing or viseme inference.
- Browser voice availability, voice selection, autoplay requirements and quality are platform-dependent. No prerecorded/studio voice files are included.

## Pilot skill trees

Each pilot has a three-node tree. A node requires its level threshold, an unlocked prerequisite and one unspent point. Unknown skill IDs, locked pilots, over-level nodes and impossible prerequisites are filtered during save normalization.

| Pilot | Core node | Left branch | Right branch |
|---|---|---|---|
| Lumi Asteria | Stellar Focus: +8% attack | Combo Catalyst: +15% combo score | Orbit Reader: +20% boss weakpoint damage |
| Noa Celeste | Aegis Frame: +1 hull | Resonance Guard: +25% shield recovery | Last Sanctuary: +25% special shield refill |
| Rin Vega | Comet Vector: +8% movement | Afterburn: 8% shorter fire interval | Ace Instinct: +10% attack |

The effects are multiplied with existing ship and pilot coefficients; they are not a separate damage path.

## Branching planet narrative

- Data-driven scenes are keyed by pilot and planet (3 pilots × 3 planets).
- A scene offers two mutually exclusive choices. The selected branch and response are saved locally.
- Following the signal grants +10% boss weakpoint damage for the associated planet sortie.
- Protecting the crew grants +1 hull and +10% shield recovery for the associated planet sortie.
- Following the signal at all three planets with the same pilot unlocks the one-time Celestial Echo route reward (+75 shards).
- Choice selection is permanent for the current save. A future chapter system may add explicit replay/route reset mechanics; this implementation does not silently overwrite past decisions.

## Multi-stage planetary events

Each planet now has two timed event stages during a sortie. Stage II is selected from the pilot's saved first-act story decision:

| First-act choice | Follow-up event | Gameplay effect | Reward |
|---|---|---|---|
| Follow the signal | Planet-specific targeting / anomaly-analysis event | 1.42× player event damage during the window | 900 score + 18 shards |
| Protect the crew | Planet-specific escort / sanctuary event | Restore shield, grant shield protection, clear hostile projectiles and slow remaining enemy shots | 900 score + 18 shards |

- Stage I remains the original planet event and retains its 650 score + 12 shard reward.
- Stage II occurs after Stage I has had time to finish; timings are planet-specific.
- Each branch has a unique name and dialogue lines for all three pilots.
- The choice and branch are deterministic from the saved pilot × planet story choice. If no first-act choice exists, the safe defensive route is used.
- Stage II is intentionally a timed combat event, not an additional save mutation. The saved branch determines the variant on every sortie.

## Boss phase and part mechanics

- Phase I starts above 50% boss HP; Phase II starts at 50%; Phase III starts at 25%.
- Weakpoint exposure duration and cadence change by phase.
- Attack interval falls from 1.50 seconds to 0.95 seconds and then 0.68 seconds. Standard volleys increase from 3 to 7 to 11 projectiles where the attack pattern uses a fan.
- Left/right cannons have independent health. Destroying one suppresses its corresponding side of the pattern; destroying both removes those cannon attacks.
- Aegis Colossus adds a destructible armor plate. Part destruction grants score/shards and a short combo increment.
- Collision is bounded to a small number of parts per boss. No Rapier or BVH runtime dependency is justified for this arena.

## Audio and effects

- Normal and boss melodies remain original Web Audio synthesis, arranged over a four-chord progression with sustained triads, bass roots, counter-line and light pulse.
- Every fifth combo tier plays a short harmonic accent; Stage II events, boss phases and part breaks have dedicated cues.
- This is an original procedural synthesizer arrangement, not a recorded performance or studio-mastered BGM. Recorded/licensed tracks and authored SFX remain a separate production task requiring provenance, license review and audio mixing.

## Additional equipment and cosmetic differentiation

- Add the unlockable `Astra-Arc` resonator ship. It has a unique swept-wing silhouette and resonance ring plus its own stat trade-off: attack 1.12×, fire interval 1.08×, movement 1.02×, zero hull bonus, shield recharge 0.92×, unlock cost 980 shards.
- Add `Eclipse Lance`, a fifth weapon that combines homing and one-target piercing. It uses a single high-output projectile, damage 1.72×, fire interval 1.92×, speed 12.2 and unlock cost 680 shards.
- Add the unlockable `Nebula Veil` pilot outfit palette. It recolors the uniform and accessory/trim materials and is stored separately from the chosen pilot identity. Unlock cost: 540 shards.
- The fifth weapon also updates the arsenal achievement requirement from four to five weapons.

## Save and backup

- Persist pilot-specific skill IDs, planet/pilot story choices and the Celestial Echo flag in the version-1 save payload.
- Zod validates shape and bounds; normalization validates semantic IDs and progression prerequisites.
- JSON checksum continues to detect accidental corruption only. It is not a cryptographic signature.
- Existing v1 backups that omit the new keys must still restore with empty skills/choices/flags.
- No schema migration to a cloud service is part of this work.

## Performance and QA

- Keep the pilot showcase separate from the combat WebGL renderer and cap its pixel ratio and frame rate.
- Do not enable postprocessing, physics or BVH acceleration without an iPhone performance reason.
- Test responsive landscape viewports in Playwright, but treat this as browser emulation only.
- Physical QA must record device model, iOS and browser versions, viewport, PWA install state, FPS/frame-time distribution, WebGL context events, missed touches, thermal observations and backup round-trip results.
- See `docs/qa/iphone-field-test.md` for the repeatable A↔B transfer protocol.

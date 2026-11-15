# Pilot Immersion & Boss Evolution — Implementation Plan

Date: 2026-11-15  
Branch: `feat/pilot-immersion-boss-evolution`  
Base: `feat/planetary-combat-expansion`

## Work packages

### A. Pilot identity and rendering
- [x] Create an original procedural full-body model as an offline-safe fallback.
- [x] Add an optional local VRM / GLB importer and model disposal.
- [x] Add pilot-specific accessory and idle-animation differences.
- [x] Cap showcase rendering to DPR 1.0 and 30 FPS; dispose it before entering combat.
- [ ] Supply and license-check complete VRM character assets (none bundled in this slice).

### B. Voice and interaction
- [x] Add a Japanese browser speech-synthesis action and a text-caption fallback.
- [x] Drive basic mouth movement during speech and the VRM `aa` expression where available.
- [ ] Record and mix professional voice lines and implement phoneme/viseme-accurate lip-sync.

### C. Skill progression
- [x] Define three pilot-specific nodes per pilot, including prerequisites and level gates.
- [x] Normalize and save skill IDs.
- [x] Apply skill effects to damage, movement, rate of fire, shield, hull, weakpoint and combo score.
- [x] Cover unlock rules and profile-specific bonuses with Vitest.

### D. Story and planetary decisions
- [x] Write pilot × planet scenes (nine initial scene entries).
- [x] Save a single irreversible branch choice per scene and display the consequence.
- [x] Give follow-signal a weakpoint preparation bonus and protect-crew a defensive preparation bonus.
- [x] Add a route achievement for following the signal across all three planets.
- [ ] Expand into a multi-chapter campaign with choice-dependent events, side missions and replayable routes.

### E. Planet event depth
- [x] Preserve Stage I's original event timing, effect and reward.
- [x] Add a timed Stage II to all three planets, after Stage I is complete.
- [x] Branch Stage II by the saved pilot × planet decision, with distinct offensive and defensive variants.
- [x] Add pilot-specific dialogue, effects, rewards and deterministic unit/E2E coverage.

### E. Boss evolution
- [x] Add three HP-threshold phases and phase-dependent attack cadence.
- [x] Add destructible left/right cannons and the Colossus armor plate.
- [x] Gate the associated attack patterns by live parts.
- [x] Add pure state reducers and Vitest coverage for phase windows and part damage.
- [ ] Add more boss families, new attack telegraphs and a full balance pass based on observed play data.

### F. Sound and presentation
- [x] Add combo-tier audio accents to the existing adaptive Web Audio score.
- [x] Surface boss phase and remaining part counts in the HUD.
- [ ] Create original recorded/arranged BGM and SFX with clear rights and mix/mastering.

### H. Additional customization and balancing
- [x] Add Astra-Arc as a fourth ship with a distinct resonator silhouette and stat profile.
- [x] Add Eclipse Lance as a fifth weapon combining homing and piercing behavior.
- [x] Add the Nebula Veil pilot outfit as a shard-unlocked cosmetic with save persistence.
- [x] Update arsenal achievement threshold and test data for all five weapons.
- [x] Add unit and E2E coverage for the new ship, weapon, outfit and backup round trip.
- [ ] Balance these additions with measured playtest data rather than theory-only tuning.

### G. Persistence and device verification
- [x] Add skill/story/reward fields to v1 save and backup payloads.
- [x] Keep newly added fields optional for legacy v1 backup compatibility.
- [x] Add backup round-trip and forged-ID normalization tests.
- [x] Document an iPhone A↔B file-transfer, PWA and performance protocol.
- [ ] Complete real iPhone Safari / Brave testing, PWA install, A→B→A restore and sustained 20-minute performance runs.

## Verification gates

1. Vitest: pilot skill gates, bonus isolation, story branch normalization/bonuses, boss phases/parts, and legacy/new backup round-trips.
2. Production PWA build: strict TypeScript and Vite bundling, including lazy VRM chunk.
3. Playwright: iPhone-sized landscape layout, 3D preview existence, branch persistence, gameplay pause/resume, and existing save transfer flow.
4. Manual physical device: complete `docs/qa/iphone-field-test.md`; collect dated evidence before claiming iPhone certification.
5. Review licenses of any VRM, music, sound, texture or font asset before bundling it.

## Current limitations

- The procedural pilot is an original low-poly display rig, not a production anime-quality humanoid.
- Browser TTS is device-generated and can vary by browser/OS. No studio voice or phoneme-level lip-sync exists.
- The nine scenes are a short initial branch layer, not a complete long-form narrative campaign.
- Three boss profiles are present; the new phases and parts deepen them but do not add a large new boss roster.
- Audio remains synthesized; high-quality recorded assets are not present.
- No physical iPhone test result is claimed. CI browser emulation cannot measure real device thermals or long-session frame pacing.

# Starlight Wing MVP Implementation Plan

> For agentic workers: implement this plan task-by-task with test-first changes and verified commits.

**Goal:** Ship an iPhone-first 3D shooter vertical slice as an offline-capable PWA in the existing repository.

**Architecture:** A small pure game-core module owns deterministic combat/progression/save rules. A Three.js runtime owns scene objects and frame updates; a DOM HUD owns accessible touch controls and menus; Dexie owns local persistence; Zod validates portable save files.

**Tech Stack:** TypeScript, Vite, Three.js r186, Dexie 4, Zod 4, vite-plugin-pwa, Vitest, Playwright.

**Spec:** docs/superpowers/specs/2026-11-14-starlight-wing-design.md

## Global Constraints

- No server-side dependency is required to start or save a run.
- Use no remote art, fonts, or music in the first milestone.
- Rendering pixel ratio is capped and particle/entity counts are bounded.
- Use pointer events with pointer capture; pause on visibility loss.
- A backup import must validate before replacing any existing save.

## Review Focus

- Extremely narrow and wide viewport sizes must keep all touch controls reachable.
- Repeated pointercancel / lostpointercapture must not leave movement stuck.
- A hidden-tab transition must pause once and must not accrue catch-up damage.
- Corrupt, outdated, or malicious backup JSON must be rejected without overwriting a valid save.
- A missing WebGL2 context must produce a readable fallback instead of a blank page.

---

### Task 1: Pure game rules and save validation

Files: src/game/core.ts, tests/core.test.ts

Interfaces: clamp, resolveDamage, upgradeCost, createDefaultSave, sanitizeSaveData, createBackup, and verifyBackup.

- [x] Write the failing test first.
- [x] Verify RED in GitHub Actions before implementation.
- [x] Implement the pure combat, upgrade and save-validation functions.
- [x] Add boundary tests for hostile values and checksum tampering.

### Task 2: 3D play loop and touch input

Files: src/game/Game.ts, src/game/input.ts, src/main.ts, src/style.css

Interfaces: Game.start(mode), Game.pause(), Game.resume(), Game.dispose(), Game.onHudUpdate, and TouchInput.

- [x] Build the capped-resolution Three.js scene and procedural ship/enemy models.
- [x] Implement pointer capture, target clamping, smoothed movement, and auto-fire.
- [x] Add nine non-boss enemy archetypes (ten combat roles including the phased boss), progressive unlocks, distinct movement/attacks, projectile handling, simple hit tests, and guardian shielding.
- [x] Add bounded explosions, a layered starfield, and low-cost pickup effects.

### Task 3: Persistence, progression and backup

Files: src/persistence/database.ts, src/persistence/backup.ts, src/ui/Hud.ts

Interfaces: loadSave, saveProgress, exportSave, and importSave.

- [x] Persist currency, upgrades, mode high scores, and settings in Dexie.
- [x] Create a versioned checksum-protected JSON backup and validate the complete payload before transaction.
- [x] Add permanent attack/hull upgrades; show an explicit memory-only warning when IndexedDB is unavailable.

### Task 4: PWA, UI polish and end-to-end validation

Files: index.html, vite.config.ts, public/*, playwright.config.ts, tests/e2e/*, README.md.

Interfaces: menu/mode selection, pause/restart, audio controls, backup transfer UI, app install instructions.

- [x] Add a landscape-first responsive HUD, safe-area CSS, portrait rotate notice, and readable fallbacks.
- [x] Configure the PWA manifest and service worker precache for application assets.
- [x] Add Playwright shell smoke tests; run unit tests and production build in CI.
- [x] Document iPhone install steps and the remaining manual-device checks.

### Task 5: Review and deploy preview

Files: GitHub branch and Vercel preview configuration.

- [x] Review the current MVP change set and fix the storage-status and enemy-geometry-allocation findings.
- [x] Verify CI at the current branch head: unit tests, production build, and iPhone-sized Chromium Playwright smoke tests all pass.
- [x] Document a StackBlitz development-preview route for the public branch.
- [ ] Deploy to a stable static HTTPS host. Vercel Hobby project creation returned HTTP 403 for the connected team; no production URL is claimed.

### Task 6: GPU context lifecycle and mobile resilience

Files: src/game/Game.ts, src/main.ts, tests/e2e/app.spec.ts.

- [x] Pause the active run when the browser reports WebGL context loss.
- [x] Tell the player when the context is restored and require an explicit resume.
- [x] Add a Playwright regression test for loss → pause → restore → resume.
- [ ] Verify actual context loss/recovery and thermal behavior on physical iPhone Safari and Brave.

## Verified scope boundary (2026-11-14)

CI success is not physical iPhone certification. Safari / Brave on iOS, real GPU context loss/recovery, sustained frame rate, heat, PWA installation, and device-to-device backup restoration still require manual testing. The current game has three selectable and permanently unlockable procedural ships (Lumen-01, Aqua-Comet and Rose-Bastion), three selectable and permanently unlockable pilot profiles (Lumi, Noa and Rin), two permanent stat-upgrade tracks, nine regular enemy archetypes and one phased boss. Pilot-specific story episodes / voice lines / dedicated skill trees, ship skins, weapon collections, ten-plus weapon families, authored campaign content, adaptive music and a fully tuned long-session economy remain roadmap items.


### Task 7: Permanent ship roster

Files: src/game/ships.ts, src/game/core.ts, src/game/Game.ts, src/main.ts, src/style.css, tests/ships.test.ts, tests/e2e/app.spec.ts.

- [x] Define three original ship profiles with explicit combat trade-offs.
- [x] Render all three ships in the hangar and support permanent unlocks using earned shards.
- [x] Apply ship-specific movement, firing interval, attack, hull and shield-regeneration stats to the actual game loop.
- [x] Create distinct low-poly procedural silhouettes for the standard, interceptor and heavy ships.
- [x] Persist ship unlocks/selection using the existing save format and include them in JSON backups.
- [x] Reject unknown or forged ship identifiers during save sanitization.
- [x] Add unit tests for roster balance and save/backup round trips, plus an iPhone-sized browser test for the hangar state.
- [ ] Tune balance and touch feel from physical iPhone playtests.

**Initial tuning constants (design values, not measured balance):**

| Ship | Unlock cost | Attack | Fire interval | Movement response | Hull bonus | Shield recharge |
|---|---:|---:|---:|---:|---:|---:|
| Lumen-01 | Free | 1.00× | 1.00× | 1.00× | +0 | 1.00× |
| Aqua-Comet | 350 shards | 0.88× | 0.78× | 1.24× | +0 | 0.88× |
| Rose-Bastion | 750 shards | 1.32× | 1.16× | 0.80× | +2 | 1.30× |


### Task 8: Permanent pilot roster and legacy-save migration

Files: src/game/pilots.ts, src/game/core.ts, src/game/Game.ts, src/main.ts, src/style.css, tests/pilots.test.ts, tests/e2e/app.spec.ts.

- [x] Define three original pilots: Lumi (balanced), Noa (support/defense), Rin (assault/mobility).
- [x] Add pilot selection and shard-based permanent unlocks to the hangar.
- [x] Apply pilot-specific attack, fire interval, movement response, hull, shield regeneration and special-attack multipliers in the game loop.
- [x] Reflect pilot identity in the selected-pilot card, combat HUD and cockpit accent material.
- [x] Persist unlocked/selected pilots in local IndexedDB and new JSON backups.
- [x] Keep save format version 1 and give old backups without pilot fields a safe default pilot.
- [x] Reject unknown or locked pilot identifiers during save sanitization.
- [x] Add unit tests for role trade-offs, invalid identifiers, new backup round trips and an old version 1 backup fixture.
- [x] Add browser tests for the three-pilot hangar and in-combat HUD.
- [ ] Add pilot-specific level/XP trees, voice lines and personal story episodes.

**Initial pilot tuning constants (design values, not measured balance):**

| Pilot | Unlock cost | Attack | Fire interval | Movement response | Hull bonus | Shield recharge | Special damage |
|---|---:|---:|---:|---:|---:|---:|---:|
| Lumi | Free | 1.00× | 1.00× | 1.00× | +0 | 1.00× | 1.00× |
| Noa | 420 shards | 0.94× | 1.06× | 0.96× | +1 | 1.40× | 1.25× |
| Rin | 650 shards | 1.16× | 0.92× | 1.12× | +0 | 0.88× | 0.92× |

The existing global pilot XP/level field remains intact. It is not yet a per-pilot progression tree.


### Task 9: Per-pilot leveling and save migration

Files: src/game/pilots.ts, src/game/core.ts, src/game/Game.ts, src/main.ts, tests/pilots.test.ts.

- [x] Store a separate level / XP record for each unlocked pilot.
- [x] Award run XP only to the pilot selected for that sortie.
- [x] Restore the selected pilot's own level when switching pilots; newly unlocked pilots start at level 1.
- [x] Apply level growth in combat: +1% attack per level up to +20%, and +1 hull at every 10 levels after level 1.
- [x] Show each pilot's level in the hangar and selected-pilot card.
- [x] Keep legacy `pilotLevel` / `pilotXp` as selected-pilot mirrors for older code / backup compatibility.
- [x] Migrate old shared XP to the currently selected pilot; if no pilot selection exists, migrate to Lumi.
- [x] Drop unknown pilot IDs from the progress map and clamp levels / XP at the save boundary.
- [x] Test new backup round trips, pre-pilot backups, intermediate shared-XP saves, independent pilot growth and malformed progress keys.

**Growth rule (gameplay design constants):** attack multiplier = 1 + 1% × min(20, Lv − 1); hull bonus = floor((Lv − 1) / 10). Level is capped at 100. These are tuning values, not measured balance results.


### Task 10: Expanded combat pickups

Files: src/game/pickups.ts, src/game/Game.ts, tests/pickups.test.ts.

- [x] Keep shard and repair drops.
- [x] Keep overdrive for temporary higher damage / faster fire.
- [x] Add temporary multishot (up to two additional projectiles for 9 seconds).
- [x] Add temporary movement-response boost (1.32× for 8 seconds).
- [x] Add instant shield restoration (+35, capped at 100).
- [x] Add instant special-energy restoration (+35, capped at 100).
- [x] Keep all effects bounded and reset them when starting a new run.
- [x] Add deterministic weighted drop selection and unit tests for every probability boundary / invalid random input.

**Drop weights:** shard 34%, repair 14%, overdrive 16%, multishot 12%, shield 12%, speed 6%, special 6%. Probabilities are initial design values and should be tuned from play data.

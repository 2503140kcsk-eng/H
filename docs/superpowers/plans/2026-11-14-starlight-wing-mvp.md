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

### Task 11: iPhone Quality Gate and local diagnostics

Files: src/game/diagnostics.ts, src/game/Game.ts, src/main.ts, src/style.css, tests/diagnostics.test.ts, tests/e2e/app.spec.ts, docs/qa/iphone-quality-gate.md.

- [x] Add unit coverage for frame-time summary edge cases and CSV escaping.
- [x] Add a local-only device diagnostics panel with JSON / CSV export.
- [x] Capture up to 600 active-gameplay frame intervals and summarize average, p95, worst and estimated FPS.
- [x] Ignore the first animation callback (no prior timestamp) and all inactive / invalid intervals so page uptime is never counted as one frame.
- [x] Capture the latest Three.js draw calls, triangles, geometry / texture counts, drawing-buffer size and WebGL2 limits.
- [x] Capture browser viewport, touch / PWA capability and Storage API / IndexedDB persistence information.
- [x] Verify the full flow in Playwright: start a real sortie, collect a non-empty frame sample, return to hangar, and export JSON and CSV with non-zero rendering data.
- [x] Document the physical-device procedure and unsupported metrics.
- [ ] Run Safari / Brave on a physical iPhone, record 2-minute and 10-minute runs, and attach user-reviewed exports before making device-performance claims.

Metric boundary: Three.js renderer.info resets at each render() call by default. The current game performs one render per animation frame and reads counters immediately afterward. If post-processing adds multiple render passes, set autoReset to false, reset once per frame, and then read the aggregate. Frame-time values are requestAnimationFrame interval estimates, not direct GPU timings.

Privacy boundary: diagnostic collection is local-only; User-Agent is included in exported files and should be reviewed before sharing. The app does not read location, camera, microphone, contacts, battery or device temperature.
### Task 12: Free GitHub Pages deployment path

Files: vite.config.ts, package.json, scripts/verify-pages-build.mjs, .github/workflows/ci.yml, .github/workflows/deploy-pages.yml, README.md, docs/architecture/tool-roles.md.

- [x] Derive the production base path from GITHUB_REPOSITORY and use /H/ for this repository's project site.
- [x] Scope the PWA manifest id, start_url, scope, icon URL and Workbox navigation fallback to the repository base.
- [x] Add a build-artifact verifier for HTML asset URLs, manifest scope, icon files and service-worker navigation fallback.
- [x] Run the subpath build and verifier in the quality-gate workflow.
- [x] Add a main-only GitHub Pages build/upload/deploy workflow using the official Pages artifact/deploy actions.
- [x] Document that feature branches and pull requests never publish and that the public Pages URL is provisional until enabled.
- [ ] A repository administrator selects Settings > Pages > Build and deployment > Source > GitHub Actions; then merge to main and verify the first deployment URL.

Cost/security boundary: the Pages workflow uses GitHub Actions' hosted runner and GitHub's Pages artifact/deploy actions; it adds no runtime server, database, secret, third-party asset or paid API. The deployment job requires pages:write and id-token:write, is gated to refs/heads/main, and does not run for this draft PR's feature branch.
### Task 13: Three-weapon hangar and combat loadout

Files: src/game/weapons.ts, src/game/core.ts, src/game/Game.ts, src/main.ts, src/style.css, tests/weapons.test.ts, tests/e2e/app.spec.ts, README.md.

- [x] Add test-first coverage for weapon profile distinctions, default selection, locked/forged IDs, old local saves, old version-1 backup imports and new backup round trips.
- [x] Define three original profiles: Star Pulse (single standard shot), Prism Fan (three-shot spread with reduced per-shot damage), Nova Lance (high-damage, slower, one-target piercing shot).
- [x] Persist unlockedWeapons and selectedWeapon as additive version-1 fields. Older local saves and backups that omit them migrate to Star Pulse without losing other progress.
- [x] Add a compact three-card weapon dock with shard unlock / select actions and show the active weapon in the combat HUD.
- [x] Feed weapon projectile count, spread, damage, cooldown, speed, radius, tint and pierce count into the existing capped Three.js projectile loop.
- [x] Reuse the current shared projectile geometry and bounded projectile list; do not add runtime packages or remotely loaded assets.
- [x] Test that Nova Lance damages each enemy at most once per projectile and can pass through exactly one additional target.
- [x] Add Playwright coverage for hangar selection, combat HUD selection, save persistence and JSON export/import.
- [x] Update README and repository tool-role notes; record that weapon values are starting design constants and still need physical iPhone balancing.

Cost/performance ruling: no new dependencies, network requests, physics engine, post-processing pass or asset downloads. Simple custom hit tests remain sufficient for the bounded 18-enemy / 110-projectile arena.

**Starting weapon values (design constants, not measured balance):** Star Pulse = 1.00× damage / 1.00× interval; Prism Fan = 3 × 0.42× damage / 1.12× interval / 0.16 radian spacing; Nova Lance = 1.75× damage / 1.50× interval / +1 additional target. All share the capped projectile geometry pool and total projectile count remains at most 110. Physical iPhone playtests are still required to tune target acquisition, hit rate and shard costs.


### Task 14: Avoid duplicate free CI runs

Files: .github/workflows/ci.yml, README.md, docs/architecture/tool-roles.md.

- [x] Use one `push` trigger for `main` and repository-owned `feature/**` branches; omit the separate `pull_request` trigger.
- [x] Add `workflow_dispatch` for manual checks.
- [x] Update the contributor / tool-role notes to explain that the push-associated commit check is shown on the PR and prevents a second run.
- [x] Keep the complete tests, production build, GitHub Pages subpath build and browser E2E within one Quality Gate.
- [ ] Verify on the next PR update that exactly one Quality Gate run is created and it completes successfully.

Cost boundary: this reduces duplicate CI executions on PR pushes; it does not change the tests or require a paid plan.


### Task 15: Local VRM pilot import and hangar preview

Files: package.json, src/game/vrmFile.ts, src/game/vrmPreview.ts, src/persistence/database.ts, src/main.ts, src/style.css, tests/vrmFile.test.ts, tests/e2e/app.spec.ts, README.md, docs/architecture/tool-roles.md.

- [x] Add the MIT-licensed `@pixiv/three-vrm` runtime at pinned version 3.5.5; retain the existing Three.js 0.186 runtime using the package's peer range (three >= 0.137).
- [x] Load the VRM code only after the user selects a model; no VRM code is required for the initial title-screen bundle.
- [x] Exclude the ~195 KiB VRM loader chunk from install-time Workbox precache and CacheFirst it in a dedicated 30-day, one-entry runtime cache; assert both properties in the Pages artifact verifier.
- [x] Validate `.vrm` extension, non-empty file size and a 32 MiB import ceiling before model parsing.
- [x] Add a separate Dexie v2 table for local per-pilot VRM blobs; existing save and recovery tables and save version 1 remain unchanged.
- [x] Parse local file bytes with GLTFLoader + VRMLoaderPlugin, optimize redundant vertices / skeletons, fit the avatar to a compact preview and update spring-bone runtime during a 30 FPS idle loop.
- [x] Stop the preview loop and release model GPU resources / context before starting combat; restore the selected pilot's preview on return to hangar.
- [x] Add unit coverage for valid extension, uppercase extension, empty file, size limit and oversized file; add browser coverage for rejecting non-VRM files.
- [x] Document that model files are local, user-supplied, not uploaded, and not included in JSON progression backups.

Performance / privacy boundaries: the game does not ship a sample character or contact any model CDN. The model is parsed from a user-selected local file and stored in browser IndexedDB per pilot. The preview is capped to 30 FPS and DPR 1.0; the combat renderer is not active while the preview renderer is running. The 32 MiB file limit is a conservative starting guard, not a guarantee that every accepted VRM fits every device's free memory. No lip-sync or voice generation is claimed in this task; those need a separate voice/phoneme pipeline.

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

- [ ] Add a landscape-first responsive HUD, safe-area CSS, portrait rotate notice, and readable fallbacks.
- [ ] Configure the PWA manifest and service worker precache for application assets.
- [ ] Add Playwright shell smoke tests; run unit tests and production build in CI.
- [ ] Document iPhone install steps and the remaining manual-device checks.

### Task 5: Review and deploy preview

Files: GitHub branch and Vercel preview configuration.

- [x] Review the current MVP change set and fix the storage-status and enemy-geometry-allocation findings.
- [x] Verify CI at the current branch head: unit tests, production build, and iPhone-sized Chromium Playwright smoke tests all pass.
- [x] Document a StackBlitz development-preview route for the public branch.
- [ ] Deploy to a stable static HTTPS host. Vercel Hobby project creation returned HTTP 403 for the connected team; no production URL is claimed.

## Verified scope boundary (2026-11-14)

CI success is not physical iPhone certification. Safari / Brave on iOS, sustained frame rate, heat, PWA installation, and device-to-device backup restoration still require manual testing. The current game has one procedural ship and one pilot profile, two permanent upgrades, nine regular enemy archetypes, and one phased boss. Full character/ship collection, ten-plus weapons, campaign content, authored adaptive music, and long-session progression remain roadmap items.

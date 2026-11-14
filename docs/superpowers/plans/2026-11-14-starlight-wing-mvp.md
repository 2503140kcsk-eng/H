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
- [ ] Implement the minimal pure functions and pass all tests.
- [ ] Add boundary tests for negative values and checksum tampering.

### Task 2: 3D play loop and touch input

Files: src/game/Game.ts, src/game/input.ts, src/main.ts, src/style.css

Interfaces: Game.start(mode), Game.pause(), Game.resume(), Game.dispose(), Game.onHudUpdate, and TouchInput.

- [ ] Build the capped-resolution Three.js scene and procedural ship/enemy models.
- [ ] Implement pointer capture, target clamping, smoothed movement, and auto-fire.
- [ ] Add three enemy archetypes, projectile handling, simple hit tests, and a boss state machine.
- [ ] Add bounded explosions, a layered starfield, and low-cost pickup effects.

### Task 3: Persistence, progression and backup

Files: src/persistence/database.ts, src/persistence/backup.ts, src/ui/Hud.ts

Interfaces: loadSave, saveProgress, exportSave, and importSave.

- [ ] Persist currency, upgrades, best scores, settings, and unlocked collections in Dexie.
- [ ] Create a versioned checksum-protected JSON backup and validate the complete payload before transaction.
- [ ] Add permanent attack/hull upgrades and local result history.

### Task 4: PWA, UI polish and end-to-end validation

Files: index.html, vite.config.ts, public/*, playwright.config.ts, tests/e2e/*, README.md.

Interfaces: menu/mode selection, pause/restart, audio controls, backup transfer UI, app install instructions.

- [ ] Add a landscape-first responsive HUD, safe-area CSS, portrait rotate notice, and readable fallbacks.
- [ ] Configure the PWA manifest and service worker precache for application assets.
- [ ] Add Playwright shell smoke tests; run unit tests and production build in CI.
- [ ] Document iPhone install steps and the remaining manual-device checks.

### Task 5: Review and deploy preview

Files: GitHub branch and Vercel preview configuration.

- [ ] Review the full change set and fix critical/important findings.
- [ ] Verify CI status and deployment build logs.
- [ ] Publish a preview URL only after the tested branch builds successfully.

# Q-TRACE — iPhone Quality Gate design

## Intent

Give the iPhone-first Starlight Wing PWA an auditable, on-device readiness report before publishing a candidate. The report must help distinguish browser capability from behavior that was actually observed and behavior that only a human can verify on physical iPhone hardware.

## Goals

- Provide a diagnostic screen reachable from the hangar without starting a run.
- Detect secure context, WebGL 2, Pointer Events, touch capability, orientation / viewport, PWA manifest and Service Worker, IndexedDB persistence and Web Audio state.
- Observe WebGL context loss / restoration, game-canvas pointer down / up / cancel, and page lifecycle transitions while the game runs.
- Export a versioned JSON and RFC 4180-style CSV report with evidence, suggested next action, environment and manual field checks.
- Keep all diagnostics local; add no analytics, remote telemetry, login or paid service.
- Preserve save format version 1 and validate both legacy data and corrupted imports.

## Non-goals

- Claiming iOS Safari / Brave certification from Chromium or WebKit emulation.
- Guaranteeing 60 FPS, thermal performance, PWA installation or cross-device restoration without an actual device run.
- Replacing existing Three.js, Dexie, Zod, PWA or Web Audio implementation.
- Adding cloud saves, authentication, a paid backend, third-party asset packs or another audio engine.

## Approaches considered

1. **Manual checklist only:** cheapest, but it does not catch missing APIs or regressions in the browser build.
2. **Automated browser probes only:** repeatable, but dangerously conflates browser emulation with real iPhone validation.
3. **Hybrid Q-TRACE passport (chosen):** automated capability checks plus observed event counters plus explicit physical-device checkboxes, all exported with evidence. This retains automation value without overstating certification.

## Design

- `src/diagnostics/iphone-quality-gate.ts` owns pure check evaluation, summary scoring, CSV formatting and browser observation.
- `src/diagnostics/iphone-quality-gate.css` owns a safe-area-aware landscape-friendly diagnostic modal.
- `src/game/audio.ts` exposes the existing AudioContext state and a user-gesture resume method; audio engine ownership stays in SoundDirector.
- The observer attaches capture listeners to the existing game canvas and lifecycle events. It does not create a second renderer or intercept gameplay input.
- The JSON contract is `starlight-wing-q-trace`, version 1. Statuses are pass, warn, fail and manual. No observation is never silently upgraded to pass.
- The report score counts automated non-manual checks only. Any failure blocks; any warning or manual item means device check required.
- Manual checklist covers touch drag/release, background / foreground resume, PWA installation / offline launch, cross-device backup restore, and sustained play / thermal performance.

## Delivery and constraints

- Branch: `feat/iphone-quality-gate`, parent: `feat/pilot-immersion-boss-evolution`.
- Existing PR #1 and the parent branch are not rewritten, merged, closed or discarded.
- GitHub Pages repository base is `/H/`; Vite and PWA paths are built consistently for the project site. Default local dev continues to use `/`.
- GitHub Actions runs unit, regression, Playwright and both default / Pages production builds. Only a passing branch push can deploy the Pages candidate.
- First-time repository setup still requires Settings → Pages → Build and deployment → Source → GitHub Actions.

## Acceptance criteria

- Unit tests cover check status decisions, no-observation semantics, score and CSV quoting.
- Regression tests cover legacy version-1 local saves, old version-1 backups, changed-checksum payloads, truncated JSON and oversized files.
- Browser E2E verifies the diagnostics screen, audio unlock control, CSV / JSON download and observed canvas input.
- GitHub Actions is green and the Pages candidate artifact/deployment is available.
- Physical iPhone Safari and Brave checks remain explicitly pending until recorded with Q-TRACE exports and a completed manual checklist.

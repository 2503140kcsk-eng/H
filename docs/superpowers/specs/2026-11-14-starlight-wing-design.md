# Starlight Wing — Product and Technical Design

## Intent

Build a cute anime-inspired, top-down 3D space shooter that can be played on an iPhone in landscape orientation, with touch-follow movement, automatic fire, enemy patterns, boss encounters, persistent progression, and an offline-capable installable web app. The repository is the canonical source of truth.

## Goals

- Deliver a real playable first slice before adding content breadth.
- Use original procedural 3D geometry, shaders, UI, and generated audio in the first slice; do not ship unreviewed third-party art or music.
- Keep the core game client-only and usable without an account, external API, or paid backend.
- Persist meta-progression locally and validate manual backup imports before mutation.
- Keep the rendering path bounded for mobile GPUs and degrade quality before compromising input responsiveness.

## Non-goals for the first playable slice

- A fully voiced cast, full character 3D models, cinematic story, 200-hour campaign, online rankings, and cloud account sync.
- High-end post-processing, heavy rigid-body simulation, or large external model packs.
- Shipping commercial or third-party assets before their exact license and attribution requirements are checked.

## Constraints

- Target: iPhone Safari and Brave, landscape-first, touch-first.
- Delivery: Vite + TypeScript + Three.js + PWA; static hosting only.
- Persistence: Dexie / IndexedDB; JSON export/import for manual device transfer.
- No ads, in-app purchases, mandatory paid cloud, or required PC/Mac/Xcode workflow.
- Aim for 60 FPS, but use a capped pixel ratio and bounded entity/pool counts.
- iOS may ignore programmatic orientation locking; show a rotate-device prompt in portrait instead of claiming the browser can force landscape.

## Approaches

1. Selected: client-only Vite PWA with a lightweight Three.js game loop. Fastest route to a reliable iPhone-first playable build, offline support, and no required backend. Use custom collision checks for the initial arena and introduce physics only when mechanics justify it.
2. Three.js plus full physics/postprocessing from day one. Rejected for the first slice because it adds bundle, GPU, and debugging cost before the game loop is proven.
3. Cloud-first game with accounts and synchronized storage. Rejected because it conflicts with the no-paid-service / no-account requirement and makes first play depend on network availability.

## First milestone: playable vertical slice

- Landscape HUD and title/menu overlays.
- Procedural 3D player ship, layered starfield, enemy types, player and enemy projectiles, hit flashes and explosions.
- Drag-to-move with smoothing, automatic target selection and fire, special burst and shield actions.
- Boss with telegraphed attack phases.
- Story, stage, and endless entry points with distinct session rules.
- Score, HP, shield, kills, temporary pickup effects, local high scores and persistent currency/upgrades.
- Pause-on-background, audio synthesized after user gesture, adjustable sound volume and sensitivity.
- Dexie save store plus versioned, checksummed JSON export/import with validation.
- PWA manifest and service worker cache for the application shell.

## Quality and acceptance

- Unit tests cover clamps, damage boundaries, upgrade costs, save sanitization, and backup tamper rejection.
- CI runs tests and a production build; browser smoke tests are added with the first playable build.
- Manual iPhone testing is still required for touch feel, safe areas, install flow, thermal behavior, and actual FPS. Desktop CI cannot certify iPhone performance.
- Report only verified features as implemented. Unbuilt systems stay explicitly marked as roadmap.

## Calls made for this first milestone

- Use the working title Starlight Wing.
- First pilot profile: Lumi, a fictional original pilot shown in the interface; 3D character animation is a later asset milestone.
- First ship: Lumen-01, built from lightweight procedural meshes.
- Implement nine non-boss archetypes plus one phase-based boss (ten combat roles total). Enemy types unlock progressively by 28 seconds so the full roster can appear before the stage-mode boss at 30 seconds. This is a procedural first pass; per-archetype animation and balance still need hands-on playtesting.
- Use simple collision geometry rather than Rapier until dense collision/rigid-body behavior is needed.

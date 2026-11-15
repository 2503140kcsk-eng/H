# Tool and Repository Role Allocation — Pilot Immersion & Boss Evolution

Updated: 2026-11-15  
Canonical implementation: this GitHub repository. All usage is limited to currently available connector permissions and genuinely free/no-charge actions. A connected product does **not** imply free access to its paid tiers, AI credits, cloud compute, or storage.

## Operating rules

1. The browser game remains a static, local-first PWA. No login, cloud database, online leaderboard, remote analytics, or paid API is required for the current build.
2. GitHub is the source of truth. External project boards and document mirrors do not supersede code, tests, and decisions committed here.
3. Imported art/audio is not shipped until its exact file-level license and redistribution terms are reviewed.
4. CI and Chromium E2E are not physical iPhone evidence. Real Safari/Brave measurements require a real device and are explicitly recorded in `docs/qa/iphone-field-test.md`.
5. Paid features, Firefly credits, hosted compute, and external quotas are never assumed to be free.

## Connector responsibility matrix

| Connector / tool | Assigned responsibility | Use in this milestone / cost guardrail |
|---|---|---|
| GitHub | Source control, branch/PR review, issue trail, Actions, test evidence | **Active.** Changes are committed to `feat/pilot-immersion-boss-evolution`; CI runs on push. |
| Context7 | Verify current Three.js / three-vrm APIs, loading and resource-disposal practices | **Active.** Checked VRM loader and expression-manager integration before implementation. |
| Figma | HUD layout review, safe-area/landscape component states, visual hierarchy | Connected seat is View-only in this workspace; review/reference only, no Figma write claimed. |
| Canva | Optional title art, character cards and store/promo graphics | Not needed by runtime. Use only available free elements; no paid template or AI credits assumed. |
| Adobe | Offline vector/texture/audio editing and export review | Optional future asset finishing; no paid Firefly generation or subscription assets assumed. |
| Superpowers | Requirements decomposition, test-first workflow, adversarial review checklist | No callable Superpowers connector is exposed in this session. Its workflow is represented in committed specifications, tests and CI gates; no tool execution claimed. |
| Vercel | Static HTTPS preview / deployment | Hobby project creation previously returned HTTP 403; no deployment is claimed. Revisit only when the connected account permits a free static deployment. |
| Supabase | Optional opt-in cloud save synchronization and account recovery | Deferred. The game currently avoids accounts and remote user data; check free quota and privacy design before any future adoption. |
| Notion | Roadmap mirror, narrative bible, design decision index | Optional mirror only; GitHub docs remain canonical. No paid workspace feature assumed. |
| Asana | Milestone task list, dependency/acceptance checklist | Optional planning surface; do not duplicate GitHub issues without a concrete need. |
| Atlassian Rovo | Jira/Confluence discovery, cross-team dependency and decision search | Optional team workflow; no remote Jira/Confluence changes claimed. |
| Linear | Bug triage and release milestone tracking | Optional issue mirror; GitHub Actions and PRs are the current execution trail. |
| Slack | Human-readable release notes and CI failure summaries | Optional notification sink; no messages or workspace changes claimed. |
| Automations | Opt-in scheduled CI/preview checks or release reminders | Not required for this finite implementation. No background monitoring is claimed. |
| Amplitude | Product funnel and retention analysis | Disabled / not integrated. No analytics SDK, user tracking or remote event transfer in this build. |
| PostHog | Opt-in product analytics and feature-flag experiments | Disabled / not integrated. Never enable without an explicit privacy and consent decision. |
| Neon | Future relational service if a separately approved online account system is required | Deferred; no database or paid compute introduced. |
| Convex | Future real-time cloud state / multiplayer service | Deferred; current game is single-player and local-first. |
| Parallel Search | Independent research and evidence comparison for technical decisions | Optional, only for research that needs external corroboration; no paid research action assumed. |
| Sider Scholar | Academic research on mobile rendering, usability and game balancing | Optional research role; not a build dependency. |
| Wolfram | Numerical balancing, damage/expected-value checks and formula validation | Optional offline/research calculation role; no paid service requirement. |
| Tavily | Supplemental web research and documentation discovery | Optional research only; Context7 remains the API-doc source for library-specific details. |
| Malwarebytes | Reputation checking for externally supplied asset/download URLs | Optional defensive review; never treat a scan as proof that a file is safe or licensed. |
| Plugin Management | Discover connector capabilities and user-controlled installation/permissions | Administrative only; installation/connection always requires user action. |

## Starred repository responsibility matrix

| Repository | Assigned responsibility | Adoption / state |
|---|---|---|
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | Scene graph, camera, geometry/materials, WebGL renderer and animation | **Core runtime.** Also powers the low-poly pilot showcase and local VRM viewer. |
| [pixiv/three-vrm](https://github.com/pixiv/three-vrm) | VRM 0.x/1.0 humanoid metadata, expressions and avatar updates | **Optional local import integrated.** User selects a local `.vrm` / compatible `.glb` up to 18 MB; no licensed character model is bundled. |
| [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing) | Bloom, glow, tone and other screen-space effects | Deferred until physical iPhone frame-time and thermal measurements justify the GPU cost. |
| [dimforge/rapier](https://github.com/dimforge/rapier) | Rigid-body physics and complex collision queries | Deferred. The current fixed top-down arena is better served by bounded hit tests. |
| [tweenjs/tween.js](https://github.com/tweenjs/tween.js) | Sequenced transitions, dialogue staging and boss entrance animation | Candidate for later animation orchestration; current motions use delta-time updates. |
| [gkjohnson/three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) | Accelerated raycasts and spatial queries | Deferred until collision complexity warrants BVH memory/build cost. |
| [Hidencod/tge-assets](https://github.com/Hidencod/tge-assets) | Candidate asset-source inspection and comparison | Not bundled. Verify repository contents, asset provenance, license and redistribution rights before adoption. |
| [shorepine/kenney](https://github.com/shorepine/kenney) | Candidate free-game-art reference/source | Not bundled. Audit the exact pack and license; never infer a license from the repository name. |
| [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) | glTF/GLB importer fixtures and material compatibility tests | Test/reference assets only; not production character art by default. |
| [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js) | Timeline-based music sequencing and authored score playback | Deferred. The existing short original motif is generated with Web Audio and has no Tone.js dependency. |
| [goldfire/howler.js](https://github.com/goldfire/howler.js) | Reliable playback of authored BGM/SFX files and audio sprites | Deferred until recorded/licensed audio files are ready. Current procedural music must not be described as recorded music. |
| [KilledByAPixel/ZzFX](https://github.com/KilledByAPixel/ZzFX) | Compact synthesized arcade sound effects | Optional alternative for SFX; current cues are generated by the existing Web Audio director. |
| [dexie/Dexie.js](https://github.com/dexie/Dexie.js) | IndexedDB local save persistence and schema evolution | **Core runtime.** No cloud account or network round trip. |
| [colinhacks/zod](https://github.com/colinhacks/zod) | Runtime validation of saves and user-imported JSON | **Core runtime.** Unknown skill/story IDs are normalized before use. |
| [vite-pwa/vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa) | PWA manifest, service-worker generation and offline precache | **Core build pipeline.** |
| [GoogleChrome/workbox](https://github.com/GoogleChrome/workbox) | Service-worker cache strategies and offline asset delivery | Managed through vite-plugin-pwa; avoid a duplicate hand-written service worker. |
| [donmccurdy/glTF-Transform](https://github.com/donmccurdy/glTF-Transform) | Build-time pruning and conversion of glTF/GLB files | Candidate for a future user-supplied model optimization pipeline; not yet a runtime dependency. |
| [zeux/meshoptimizer](https://github.com/zeux/meshoptimizer) | Mesh/index/vertex optimization for large characters and ships | Candidate build-time optimization; use only after measuring actual model size. |
| [google/draco](https://github.com/google/draco) | Optional geometry compression | Deferred; decoder bytes and decode latency must be included in the iPhone budget. |
| [KhronosGroup/glTF-Validator](https://github.com/KhronosGroup/glTF-Validator) | Validate exported/imported glTF/GLB assets | Recommended asset gate before bundling any third-party or generated model. |
| [vitest-dev/vitest](https://github.com/vitest-dev/vitest) | Deterministic tests for save migration, skill effects, narrative branches and boss state | **Core CI.** |
| [microsoft/playwright](https://github.com/microsoft/playwright) | Browser smoke tests, landscape viewport and user-flow regressions | **Core CI.** Chromium is not physical iOS Safari/Brave. |
| [georgealways/lil-gui](https://github.com/georgealways/lil-gui) | Development-only tuning controls for difficulty, damage and encounter pacing | Not exposed to players; defer until balancing parameters expand. |
| [codecruzer/webgl-starfield](https://github.com/codecruzer/webgl-starfield) | Starfield rendering reference and alternative benchmark | Reference only; current star layers are kept bounded and original. |

## Current architecture and boundaries

- **Pilot rendering:** a self-authored low-poly full-body procedural model is the offline fallback. The optional VRM loader operates on a user-selected file locally. No external character model, voice recording or face likeness is included.
- **Voice and mouth movement:** browser speech synthesis is used when available; the avatar mouth/VRM `aa` expression is animated while the utterance is active. This is not studio voice acting or phoneme-accurate lip-sync. Availability and voice quality vary by iOS browser.
- **Story / planetary events:** nine pilot × planet scenes persist two-way choices; those choices also select a second timed event stage on each planet (offensive target analysis or defensive escort/sanctuary). Following the signal on all three planets unlocks the one-time Celestial Echo bonus. A much longer chapter campaign with mission-wide branch rewrites remains future content.
- **Bosses:** health thresholds drive three phases; destructible ports/armor gate associated attacks. Additional boss families, skins and full balance passes remain future work.
- **Audio:** adaptive normal/boss motifs now use a four-chord progression, sustained triads, bass roots, counter-line and a light pulse layer; combo tiers, Stage II events, boss phases and part breaks have dedicated cues. This is an original procedural synthesizer arrangement, not a recorded performance; recorded/mastered BGM and authored SFX remain outstanding.
- **iPhone acceptance:** the checklist defines how to measure FPS/frame-time, missed touches, thermal state, WebGL context loss, PWA offline startup and file-based A↔B backup transfer. No physical measurements are recorded yet.

## No-cost preview and iPhone verification

- Development preview source: https://stackblitz.com/github/2503140kcsk-eng/H/tree/feat/pilot-immersion-boss-evolution
- This is a source import / development preview route, not a certified iPhone deployment URL.
- A previous Vercel Hobby project-creation attempt returned HTTP 403; no Vercel deployment is claimed.
- ChatGPT's conversation surface cannot run this Vite/Three.js repository as an inline game canvas.
- Chromium Playwright tests only provide browser-emulation evidence. Follow `docs/qa/iphone-field-test.md` on physical iPhones and record actual results before describing the build as iPhone-certified.

## License, privacy and cost policy

- No external asset is imported merely because it is publicly reachable.
- Check exact asset license, attribution, voice/music rights and redistribution terms.
- No paid AI credits, paid templates, online database, user analytics, cloud function, or external API key is required by this branch.
- Keep user saves and selected VRM files local. Do not upload personal files or identifiers to analytics services.

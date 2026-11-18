# Tool and Repository Role Allocation

The implementation repository is authoritative. Tool usage is restricted to capabilities already connected and actions that stay within free/no-charge limits. A tool being connected does not imply that every feature or AI-credit allowance in that product is free.

The Quality Gate runs once on `push` for `main` and repository-owned `feature/**` branches, plus `workflow_dispatch` for manual runs. A push to an open PR head still attaches its commit check to the PR; omitting a second `pull_request` trigger avoids duplicate GitHub Actions minutes.

## Connected work roles

| Tool | Assigned role | First milestone |
|---|---|---|
| GitHub | Source of truth, branches, commits, CI, issues and review trail | Active: PR CI, main-branch CI and free GitHub Pages build/deploy workflow |
| GitHub Pages | Free static HTTPS host for the public project repository | Workflow is prepared; repository Settings must select Pages source = GitHub Actions before the first deployment |
| GitLab Beta | Optional independent mirror / second CI review | Connector is authenticated; no owned Starlight project exists, so do not create a duplicate project without a selected destination. GitHub stays authoritative |
| Context7 | Verify current Three.js, PWA, Dexie and testing APIs before coding | Active: implementation references |
| Superpowers | Process checklist for requirements decomposition, test-first workflow, debugging and review gates | Workflow represented in repo docs; no callable Superpowers connector is exposed in this session |
| Vercel Hobby | Optional static HTTPS hosting; no server functions or paid add-ons | Connected team is Hobby, but project creation returned 403; no Vercel deployment is claimed. Revisit only after project-creation access is granted |
| Figma | Touch HUD layout, component states and visual design review | Connected Figma seat is `View` on Starter; review only unless editing access becomes available |
| Canva | Optional key art, title card and store/promo graphics; never a runtime dependency | Deferred; use only clearly free templates/assets and no paid generation |
| Adobe | Optional vector cleanup, sprite/texture editing and audio/video polish; never a runtime dependency | Deferred; Firefly credits and subscription entitlements are not assumed free |
| Notion | Optional roadmap and milestone mirror; GitHub docs remain canonical | Later; not a runtime dependency |
| Supabase | Not used for first milestone: no login/cloud sync is required; avoid introducing a backend bill or a network dependency | Deferred; reconsider only for opt-in cloud sync after explicit scope and free-quota check |

## Starred repository assignments

| Repository | Assigned role | Adoption rule |
|---|---|---|
| mrdoob/three.js | 3D scene, camera, materials, render loop and geometry | Core runtime |
| pmndrs/postprocessing | Bloom, glow and other screen-space effects | Add selectively after mobile FPS budget is measured |
| dimforge/rapier | Physics/collision for complex moving bodies | Defer; simple bounded hit tests first |
| tweenjs/tween.js | UI, boss-entry and camera transitions | Introduce when animation sequencing grows |
| gkjohnson/three-mesh-bvh | Accelerated raycasts and spatial queries | Use only when scene collision/query scale requires it |
| pixiv/three-vrm | VRM pilot model parsing, humanoid runtime and hangar preview | Added as a lazy-loaded MIT dependency. Users import their own licensed `.vrm` (32 MiB cap); files stay in per-pilot IndexedDB records, never upload, and are excluded from JSON progression backups. The app bundles no character model |
| Hidencod/tge-assets | Candidate game asset source / reference pack | Audit repository contents and each asset license before importing |
| shorepine/kenney | Candidate game asset pack / reference source | Audit repository identity and per-pack license before shipping |
| KhronosGroup/glTF-Sample-Assets | glTF importer and material compatibility fixtures | Test fixtures; not automatically production art |
| Tonejs/Tone.js | Musical sequencing and layered adaptive BGM | Later; heavier than needed for the first SFX pass |
| goldfire/howler.js | Cross-browser audio playback and audio sprite handling | Optional when authored music/audio files arrive |
| KilledByAPixel/ZzFX | Tiny synthesized arcade SFX | Candidate SFX layer; current MVP uses simple Web Audio tones |
| dexie/Dexie.js | IndexedDB persistence and schema evolution | Core persistence |
| colinhacks/zod | Runtime validation of local saves and imported JSON | Core input boundary |
| vite-pwa/vite-plugin-pwa | PWA manifest, worker registration and offline precache | Core delivery |
| GoogleChrome/workbox | Service-worker caching primitives used by the PWA pipeline | Managed through vite-plugin-pwa; avoid a duplicate hand-written worker |
| donmccurdy/glTF-Transform | glTF pruning, transforms and asset conversion | Build-time asset pipeline |
| zeux/meshoptimizer | Geometry/mesh compression and optimization | Build-time asset pipeline |
| google/draco | Optional geometry compression decoder/encoder | Only when model size warrants it |
| KhronosGroup/glTF-Validator | Validate exported glTF/GLB assets | Asset CI gate |
| vitest-dev/vitest | Unit tests for deterministic game rules, pilot/ship profiles and backward-compatible save logic | Core CI |
| microsoft/playwright | Browser smoke tests and interaction regression tests | Core CI |
| georgealways/lil-gui | Development-only balancing and debug controls | Dev build only; never required for players |
| Original weapon profiles | Persistent Star Pulse / Prism Fan / Nova Lance definitions and combat shot patterns | Implemented without new runtime packages or remote assets; shared Three.js resources and the 110-projectile cap remain |
| codecruzer/webgl-starfield | Starfield rendering reference / optional inspiration | Reimplement as small bounded layers unless its license and fit are verified |

## Current browser-preview route

- StackBlitz public GitHub import is the current no-project-permission preview path: https://stackblitz.com/github/2503140kcsk-eng/H/tree/feature/starlight-wing-mvp
- StackBlitz WebContainers are not a substitute for physical iPhone Safari/Brave validation; iOS Safari remains beta and mobile memory is constrained.
- Vercel project creation was attempted for the connected Hobby team and rejected with HTTP 403. No Vercel preview deployment URL was generated.
- GitHub Pages is the planned no-additional-cost static host. Its workflow deploys only `main`; a repository administrator must enable Pages with the GitHub Actions source once.

## Safety and license policy

- The initial weapon collection uses original code-defined profiles and procedural projectiles; no third-party asset is copied.
- Never bundle an asset merely because its repository is public.
- Check the exact asset license, attribution terms, model/texture/audio provenance and redistribution rights.
- Keep procedural MVP assets original and local.
- No production code depends on a secret, paid API key, online leaderboard, or cloud database.


## iPhone preview opened from ChatGPT

- ChatGPT's conversation view is not an execution host for this GitHub Vite application; it cannot run the repository as an inline game canvas.
- The no-project-permission preview route is the public StackBlitz import above. Open it from the ChatGPT message in iPhone Safari, start the Vite preview, then open the preview in its own tab.
- This is an external development preview, not an App Store build or a certified PWA installation. iOS Safari / Brave input, GPU context recovery, storage persistence and sustained performance must still be checked on-device.
- Do not describe Chromium Playwright tests as physical iPhone verification.

## Vector Echo combat-system allocation

The new combat layer is called **Vector Echo**. The three gameplay domains are implemented as dependency-free TypeScript modules; Three.js is an adapter and renderer, not the owner of the combat rules.

| System | Canonical implementation | Tool / repository assignment |
|---|---|---|
| Attack intent and forecast | `src/game/threatForecast.ts` | Context7 verifies Three.js r186 behavior; Three.js displays warning geometry; `tween.js` is reserved for later authored wind-up motion. |
| Evasion assessment | `assessEvasion` in `src/game/threatForecast.ts` | Vitest owns deterministic trajectory and closest-approach tests; Playwright owns HUD/browser regression; advice remains advisory and does not steer the player. |
| Structural damage | `src/game/bodyIntegrity.ts` | Three.js named meshes visualize modules; `Rapier` is intentionally deferred because the current game uses bounded 2D hit-zone math, not a rigid-body simulation. |
| Combat integration | `src/game/Game.ts` | Existing enemy/boss/projectile loops consume the independent rules; shared Three.js geometries/materials keep mobile resource use bounded. |
| Warning / feedback HUD | `src/main.ts`, `src/style.css` | Figma is for review if the connected seat permits it; no paid UI kit is required. |

## Starred repository decisions for Vector Echo

- `mrdoob/three.js`: render warning lanes, module meshes and damage feedback; reuse resources and dispose owned objects at teardown.
- `tweenjs/tween.js`: optional next step for telegraph wind-up, recoil, and break animations; not required for the current deterministic rules.
- `pmndrs/postprocessing`: optional subtle bloom on warning and exposed-core highlights only after iPhone frame-time measurements pass.
- `dimforge/rapier`: deliberately not added; the present top-down arena is more predictable and cheaper with exact swept/closest-approach math.
- `gkjohnson/three-mesh-bvh`: not needed for the current fixed number of named body zones; revisit only if detailed mesh hit testing becomes a measured bottleneck.
- `vitest-dev/vitest` and `microsoft/playwright`: assert pure domain rules first, then browser-level HUD and combat behavior.
- `KilledByAPixel/ZzFX` / `Tonejs/Tone.js`: optional audio cues for lock-on, near-miss, and module break after gameplay balance; no licensed or generated audio is bundled in this milestone.
- Asset repositories (`Hidencod/tge-assets`, `shorepine/kenney`, and Khronos sample assets) are not used by this system; the warning and module geometry are procedural and original. Per-asset license review remains mandatory before later asset adoption.

No cloud database, account, analytics, paid service, external model, or paid asset is required by Vector Echo. Transient attack forecasts and damaged modules are run-local combat state: they are not persisted into version-1 progression saves, avoiding unnecessary save migration.

## Echo Chronicle campaign-system allocation

The branching campaign is a pure state model plus a Three.js battle adapter. It does not add a cloud dependency or a second persistence authority.

| Responsibility | Canonical implementation | Assigned tools / repositories | Current boundary |
|---|---|---|---|
| Chapter, choice and ending rules | `src/game/campaign.ts` | GitHub owns source and review; Vitest verifies route invariants; Context7 checks any changing Three.js API | Pure TypeScript, deterministic and locally testable |
| Save migration and backup | `src/game/core.ts`, Dexie store and existing backup codec | Dexie + Zod; GitHub Actions | Keep save format v1 and accept older payloads that have no campaign field |
| Planet visuals and combat adaptation | `src/game/Game.ts` | Three.js core; Vitest for profiles; Playwright for menu/run smoke | Palette, spawn bias, enemy tuning, boss pattern/HP/defense and one-shot events; bounded projectile count |
| Choice / mission UX | `src/main.ts`, `src/style.css` | Figma read-only review where available; no paid UI kit | Two authored decisions per chapter; main and side operation cards; route history and replay |
| Release and local-first policy | Existing PWA and CI workflows | GitHub Pages / Workbox through vite-plugin-pwa; Supabase is deferred | No login, paid cloud, analytics or remote state required |

### Plugin use for this milestone

- **GitHub:** used for inspecting the PR, writing commits directly to `feature/starlight-wing-mvp`, and triggering the existing Quality Gate.
- **Context7:** API-reference role for Three.js / Zod behavior; no package is added merely to satisfy a tool.
- **Figma:** visual review and touch-layout critique only while the connected Starter seat remains View-only; implementation stays in code.
- **Canva / Adobe:** optional promo art, title cards, audio/video polish after the visual direction is stable. No generation credit or subscription entitlement is assumed free, and neither becomes a runtime requirement.
- **Superpowers:** test-first / implementation-plan / review discipline is recorded in these repository specs; no callable Superpowers connector is exposed in the active tool set.
- **Vercel:** optional static preview only. The connected Hobby project creation previously returned 403, so no deployment is claimed.
- **Supabase:** intentionally not used; accounts and cloud saves would add network, privacy and quota failure modes to a game whose requirement is local-first free distribution.
- **Notion:** optional roadmap mirror, deferred to avoid splitting the canonical spec from GitHub.
- **GitLab Beta:** optional independent mirror / second review. No Starlight project has been selected, so GitHub remains authoritative and no duplicate project is created.

The campaign milestone activates only the already-present Three.js, Dexie, Zod, vite-plugin-pwa / Workbox, Vitest and Playwright dependencies. No new runtime package, paid asset, server function or cloud database is introduced.

### Why several starred libraries stay deferred

- `pmndrs/postprocessing` is held until physical iPhone frame-time measurements justify bloom; the chapter palette and procedural star tint create a visible planet identity without extra render passes.
- `dimforge/rapier` and `gkjohnson/three-mesh-bvh` are unnecessary for the current bounded 2D flight arena and named damage zones.
- `tweenjs/tween.js` may later drive authored cinematic transitions, but it is not required for deterministic campaign state or battle outcomes.
- `Tonejs/Tone.js`, `howler.js` and `ZzFX` remain candidates for the adaptive score / SFX pass; this campaign slice does not bundle unlicensed music or add audio dependencies.
- `Hidencod/tge-assets`, `shorepine/kenney` and `KhronosGroup/glTF-Sample-Assets` remain license-audited asset candidates; this implementation keeps geometry and palette procedural.
- `glTF-Transform`, `meshoptimizer`, `Draco` and `glTF-Validator` stay in the asset pipeline role rather than the runtime campaign loop.
- `lil-gui` stays development-only; `codecruzer/webgl-starfield` remains a reference rather than a bundled dependency.

The roles above are assignments, not a claim that every connected app or every starred repository must be executed for each code change. Free quota, access level, license and mobile cost remain gates before adoption.

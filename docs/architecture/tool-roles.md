# Tool and Repository Role Allocation

The implementation repository is authoritative. Tool usage is restricted to capabilities already connected and actions that stay within free/no-charge limits. A tool being connected does not imply that every feature or AI-credit allowance in that product is free.

## Connected work roles

| Tool | Assigned role | First milestone |
|---|---|---|
| GitHub | Source of truth, branch/commit/PR management, CI and review trail | Active: parent MVP PR plus stacked `feat/planetary-combat-expansion` work branch |
| Context7 | Verify Three.js animation-loop, dynamic geometry and GPU resource disposal contracts before coding | Active: Three.js documentation checked for this expansion |
| Superpowers | Process checklist for requirements decomposition, test-first workflow, debugging and review gates | Test-first/design review workflow recorded in GitHub docs; no callable Superpowers connector is exposed in this session |
| Vercel Hobby | Optional static HTTPS hosting; no server functions or paid add-ons | Connected team is Hobby, but project creation returned 403; no Vercel deployment is claimed. Revisit only after project-creation access is granted |
| Figma | Touch HUD layout, component states and visual design review | Connected Figma seat is `View` on Starter; review only unless editing access becomes available |
| Canva | Optional key art, title card and store/promo graphics; never a runtime dependency | Not used for this code milestone; no paid template or AI credits assumed |
| Adobe | Optional vector cleanup, sprite/texture editing and audio/video polish; never a runtime dependency | Not used for this code milestone; Firefly credits and subscription entitlements are not assumed free |
| Notion | Optional roadmap and milestone mirror; GitHub docs remain canonical | No workspace write required for this source-of-truth milestone |
| Supabase | Not used for first milestone: no login/cloud sync is required; avoid introducing a backend bill or a network dependency | Deferred; reconsider only for opt-in cloud sync after explicit scope and free-quota check |

## Starred repository assignments

| Repository | Assigned role | Adoption rule |
|---|---|---|
| mrdoob/three.js | 3D scene, camera, materials, render loop and geometry | Core runtime |
| pmndrs/postprocessing | Bloom, glow and other screen-space effects | Add selectively after mobile FPS budget is measured |
| dimforge/rapier | Physics/collision for complex moving bodies | Defer; simple bounded hit tests first |
| tweenjs/tween.js | UI, boss-entry and camera transitions | Introduce when animation sequencing grows |
| gkjohnson/three-mesh-bvh | Accelerated raycasts and spatial queries | Use only when scene collision/query scale requires it |
| pixiv/three-vrm | Future full-body VRM pilots, expressions and hangar character display | Current milestone uses lightweight pilot icon/wing animations and data-driven skills; VRM awaits a licensed model and iPhone memory/FPS testing |
| Hidencod/tge-assets | Candidate game asset source / reference pack | Audit repository contents and each asset license before importing |
| shorepine/kenney | Candidate game asset pack / reference source | Audit repository identity and per-pack license before shipping |
| KhronosGroup/glTF-Sample-Assets | glTF importer and material compatibility fixtures | Test fixtures; not automatically production art |
| Tonejs/Tone.js | Musical sequencing and layered adaptive BGM | Not imported: `src/game/audio.ts` currently uses a small original Web Audio sequencer to avoid another runtime dependency |
| goldfire/howler.js | Cross-browser playback and audio sprite handling for authored audio files | Not imported: present audio is generated in-browser with Web Audio; evaluate only after authored audio assets are added |
| KilledByAPixel/ZzFX | Tiny synthesized arcade SFX | Not imported: cue tones and adaptive synthesized music currently share the local Web Audio director |
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
| codecruzer/webgl-starfield | Starfield rendering reference / optional inspiration | Reimplement as small bounded layers unless its license and fit are verified |

## Current browser-preview route

- StackBlitz public GitHub import is the current no-project-permission preview path: https://stackblitz.com/github/2503140kcsk-eng/H/tree/feat/planetary-combat-expansion
- StackBlitz WebContainers are not a substitute for physical iPhone Safari/Brave validation; iOS Safari remains beta and mobile memory is constrained.
- Vercel project creation was attempted for the connected Hobby team and rejected with HTTP 403. No preview deployment URL was generated.

## Safety and license policy

- Never bundle an asset merely because its repository is public.
- Check the exact asset license, attribution terms, model/texture/audio provenance and redistribution rights.
- Keep procedural MVP assets original and local.
- No production code depends on a secret, paid API key, online leaderboard, or cloud database.


## iPhone preview opened from ChatGPT

- ChatGPT's conversation view is not an execution host for this GitHub Vite application; it cannot run the repository as an inline game canvas.
- The no-project-permission preview route is the public StackBlitz import above. Open it from the ChatGPT message in iPhone Safari, start the Vite preview, then open the preview in its own tab.
- This is an external development preview, not an App Store build or a certified PWA installation. iOS Safari / Brave input, GPU context recovery, storage persistence and sustained performance must still be checked on-device.
- Do not describe Chromium Playwright tests as physical iPhone verification.

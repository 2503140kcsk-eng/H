# iPhone Quality Gate — Starlight Wing

## Purpose

Collect a repeatable, local-only snapshot of browser, storage and recent game-rendering behaviour on a physical iPhone. This is a diagnostic collection gate, not automatic certification.

## On-device procedure

1. Open the public feature-branch preview in iPhone Safari or Brave, in landscape orientation.
2. Start a Story sortie and play for at least 2 minutes. For thermal observation, continue for 10 minutes and repeat after a full app restart.
3. Pause, return to the hangar, then open **設定 → iPhone・ブラウザ診断 → 診断を更新**.
4. Confirm that game.sampleCount is greater than zero, capabilities.webgl2 is true, the FPS estimate is positive and the WebGL block is present.
5. Export JSON and CSV. Review the User-Agent and device/browser values before sharing.
6. Repeat after adding the PWA to the Home Screen and in the other browser. The StackBlitz preview is a development origin, not a production PWA deployment.

## Measurements

| Field | Meaning | Limitation |
|---|---|---|
| game.sampleCount | Number of retained active-game frame intervals, capped at 600 | No sample until a sortie has run |
| game.averageFrameTimeMs | Mean requestAnimationFrame interval | Not a GPU timer |
| game.p95FrameTimeMs | 95th-percentile frame interval | Useful for recurring stutters |
| game.worstFrameTimeMs | Maximum retained interval | Sensitive to a single tab stall |
| game.estimatedFps | 1000 divided by averageFrameTimeMs | Not a display refresh-rate or hardware FPS counter |
| game.renderCalls, game.triangles | Three.js metrics for the most recent render | One render per frame in the current implementation |
| game.geometries, game.textures | Three.js tracked object counts | Not byte-accurate GPU memory |
| game.drawingBuffer | Actual WebGL drawing buffer dimensions | May differ from CSS viewport and device resolution |
| game.webgl | WebGL2 limits and selected context attributes | Capability report, not a performance score |
| storage | Browser-exposed usage / quota estimates and persistence flags | Approximate and browser-dependent |

Three.js renderer.info resets at every render by default. The game currently renders once per animation frame and reads the counters immediately after renderer.render(). When multiple post-processing passes are introduced, set renderer.info.autoReset to false, reset once per frame, and then read the aggregate.

## Manual acceptance checklist

- [ ] Safari landscape: HUD and pause controls remain reachable around safe areas.
- [ ] Safari: touch-drag steering, auto-fire, special attack, pause and resume work.
- [ ] Safari: after a sortie, sampleCount is non-zero and WebGL2 is available.
- [ ] Safari: save persistence is persistent, or the app clearly reports a memory-only fallback.
- [ ] Safari PWA: installed app reloads with local save intact.
- [ ] Brave: repeat the same checks and compare the report fields.
- [ ] PWA: device.standalone matches the expected display mode.
- [ ] 10-minute session: manually observe heat, battery drain, slowdown, reload/crash and context-loss recovery.
- [ ] Backup: test export and restore separately using a disposable save.

## Not measurable by this browser app

The browser does not expose portable APIs for battery health, battery percentage, device temperature, thermal-throttling state, GPU utilization, GPU execution time or exact GPU/JavaScript memory bytes. The app does not read precise location, camera, microphone or contacts and does not transmit the diagnostic report. User-Agent values can still reveal device and browser details, so inspect exports before sharing.

A passing GitHub Actions Chromium run validates the code path and export formats in that CI environment only. It does not certify physical iPhone Safari or Brave behaviour, thermal stability, PWA installation or cross-device restore.
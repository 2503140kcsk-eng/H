# iPhone Field Validation — Starlight Wing

Date prepared: 2026-11-15  
Status: **protocol only; no physical device measurements have been recorded**

This checklist separates automated browser-emulation coverage from actual iPhone evidence. A passing Playwright run does not certify iOS Safari or iOS Brave.

## Device matrix

Record one row for every physical device / browser combination used:

| Device | iOS version | Browser | Viewport / orientation | PWA installed? | Result |
|---|---|---|---|---|---|
| iPhone 13 (reference) | record on test day | Safari | landscape, 844 × 390 CSS px nominal | No | Not tested |
| iPhone 13 (reference) | record on test day | Brave | landscape, record measured viewport | No | Not tested |
| Newer supported iPhone | record on test day | Safari | landscape, record measured viewport | No | Not tested |
| Newer supported iPhone | record on test day | Brave | landscape, record measured viewport | No | Not tested |

## Procedure

1. Open the static HTTPS preview in Safari. Record URL, build SHA, iOS version, browser version and date.
2. Rotate to landscape. Verify safe-area insets, title/hangar clipping, all touch targets and scroll boundaries.
3. Add to Home Screen from Safari. Launch from the Home Screen, verify standalone display and icon, then enable Airplane Mode and restart to verify cached shell and gameplay startup.
4. Play the same 20-minute route in Safari and Brave. Record one-minute FPS samples after warm-up; note frame-time spikes, dropped frames, audio interruptions, WebGL context loss, touch misses and browser reloads.
5. Record the device temperature state qualitatively at 0, 5, 10 and 20 minutes (cool / warm / hot). Do not infer internal GPU temperature from the case temperature.
6. Repeat with a boss encounter and maximum ordinary enemy density. Check that destroyed boss parts stay disabled and projectiles remain bounded.
7. Export a JSON save on device A. In Files, save it to iCloud Drive or transfer it to device B with AirDrop. On device B, open the game, export its current save first, then import the transferred JSON.
8. Verify pilot/skill choices, story branches, planet clear sequence, equipment, achievements and currency after import. Relaunch both devices and verify persistence.
9. Repeat the transfer in the reverse direction (B → A). Confirm that importing a damaged/truncated file is rejected and the previous save remains intact.

## Measurements

For every run, record:
- mean FPS and 1% low, measured after first 30 seconds;
- frame-time p50 / p95 / p99 in milliseconds;
- longest frame stall;
- page reload or WebGL context-loss count;
- missed touch / action input count;
- total play duration and device thermal observation;
- exported backup byte size and SHA-256 hash (for evidence only; the in-app checksum is a corruption detector, not a signature);
- whether the second device restored all selected equipment and progression.

A target of 60 FPS is aspirational. Record actual values rather than treating the device model or a Chromium simulation as proof.

## Backup failure tests

- Import a zero-byte file.
- Import a valid JSON backup truncated by one byte.
- Import a backup with a modified payload but unchanged checksum.
- Import a backup with an unknown pilot / skill / story choice identifier.
- Confirm the UI reports failure, the current save snapshot remains available, and no partial restore is visible.

## Evidence bundle

Attach date-stamped screenshots, a short screen recording for touch behavior, raw frame-time CSV, console log if available, and before/after backup summary. Do not include private save contents or personal identifiers in the evidence bundle.

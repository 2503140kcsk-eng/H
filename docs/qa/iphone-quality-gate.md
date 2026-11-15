# iPhone physical field test — Q-TRACE

## Scope and evidence labels

Q-TRACE has three different evidence levels:

1. **Capability probe:** API presence and configured browser features.
2. **Runtime observation:** events actually seen on the game canvas or page during this session.
3. **Physical-device confirmation:** a person checks the behavior on an actual iPhone and marks the corresponding checkbox.

A browser-emulator PASS is not an iPhone-certified PASS. Do not interpret the automated percentage as a frame-rate, battery, thermal or App Store guarantee.

## Before testing

- Open the Pages candidate over HTTPS: `https://2503140kcsk-eng.github.io/H/` (available after repository Pages settings and a successful deploy).
- Use the same physical iPhone for Safari and Brave; record iOS version, browser and whether the app is installed to Home Screen.
- Open Hangar → **◎ iPhone診断 / Q-TRACE** → **再診断**.
- Export the starting JSON / CSV. Keep the timestamped files with the manual test notes.

## Physical check sequence

1. **WebGL 2:** launch a run, play for several minutes, background the app, return, and confirm the game is paused safely. If GPU context loss occurs, confirm the restore message and require an explicit resume.
2. **Touch:** drag continuously, change direction, drag to screen edges, lift the finger, trigger pointercancel by changing apps, and verify no stuck movement or accidental browser gesture.
3. **Audio:** start / resume using an explicit tap. Confirm music / cues are audible, mute and unmute, background the app, return and use the resume action again if iOS suspended audio.
4. **PWA:** Add to Home Screen from Safari, launch standalone, rotate to landscape, confirm safe-area padding, close and relaunch offline after the first successful cache.
5. **Save / migration:** export a JSON backup to Files, import it back into the same installation, then move it to a second browser profile or iPhone and restore. Confirm ship, pilot, progression, weapon slots, planet state and collections are retained.
6. **Sustained session:** play for at least 10 minutes. Record perceived frame pacing, touch lag, audio dropouts, reloads and device warmth. Do not optimize from a single unrepeatable impression.

## Result recording

- On each completed item, tick only what was physically tested.
- Re-run Q-TRACE after the sequence and export fresh JSON / CSV. The report records browser identity, viewport, touch points, storage / audio states, and runtime evidence counters.
- Attach notes with device / iOS / browser version, test start/end time, and reproducible steps for any failure.
- Mark a failed item as not completed; never mark it complete to improve the score.

## Automated vs physical verification

| Area | Automated evidence | Physical evidence still needed |
|---|---|---|
| WebGL | WebGL 2 capability; observed lost/restored events | Actual GPU recovery under iOS memory pressure |
| Lifecycle | visibilitychange / pagehide / pageshow counters | Real app switch, screen lock and Safari restore |
| Audio | AudioContext state and direct gesture resume | Audible sound, silent switch / interruptions and resume after app return |
| Touch | Pointer Events capability and canvas down/up/cancel sequence | Continuous drag, edge behavior, palm / browser gesture interaction |
| PWA | manifest and service worker registration | Home Screen install, standalone launch, offline cache behavior |
| Save | unit-tested migration / damaged backup validation | iOS Files share sheet and device-to-device restore |
| Performance | no synthetic performance score claimed | Real FPS / frame pacing / thermal behavior over sustained play |

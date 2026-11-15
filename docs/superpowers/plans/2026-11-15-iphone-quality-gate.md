# Q-TRACE implementation plan

## Branch and safety

- [x] Create `feat/iphone-quality-gate` from `feat/pilot-immersion-boss-evolution`.
- [x] Preserve PR #1 and its `feature/starlight-wing-mvp` history.
- [x] Add regression expectations before the implementation module.

## Implementation

- [x] Add pure Q-TRACE checks, status scoring and CSV serialization.
- [x] Add local browser capability probes and live WebGL / pointer / lifecycle observers.
- [x] Add audio-state inspection and user-gesture resume using the existing SoundDirector.
- [x] Add hangar diagnostic screen and JSON / CSV export.
- [x] Add legacy-save and corrupted-backup regression coverage.
- [x] Configure the Vite and PWA project base for GitHub Pages `/H/`.
- [x] Add Actions workflow for unit, build, Playwright and Pages candidate artifact/deployment.
- [x] Document tool / starred-repository roles and the physical iPhone test boundary.

## Verification still required

- [ ] Run the complete GitHub Actions workflow on this branch and fix all failures.
- [ ] Confirm the Pages Settings source is GitHub Actions and deployment completes.
- [ ] Install / open the candidate on physical iPhone Safari and Brave.
- [ ] Exercise WebGL context restore and background / foreground transitions on device.
- [ ] Confirm user-gesture audio resume, touch drag release, backup export/import across devices.
- [ ] Record sustained-session FPS and device temperature; optimize only if measurements justify it.

Do not treat Chromium Playwright results as physical-device sign-off. Do not merge the draft PR until the review trail and field-test evidence are complete.

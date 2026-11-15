# Starlight Wing — Save Format v2

Date: 2026-11-15  
Target branch: `feat/pilot-immersion-boss-evolution`  
Parent: current Draft PR #3 head

## Goal

Move long-form campaign persistence to an explicit, versioned format before adding more chapters or boss content. Every existing v1 save and v1 JSON backup remains readable. New exports use v2. A rejected import or failed database transaction must leave the active save unchanged.

## Constraints

- Keep saves local-first. Dexie / IndexedDB remains the durable store; JSON files remain the portable backup format.
- Do not add a cloud account, network save, paid SDK, analytics, or remote storage.
- Keep the existing top-level progression fields and current gameplay-facing `storyChoices` / `completedPlanets` fields during this migration.
- Continue to validate structure with the already-installed Zod and validate semantic IDs against game-owned registries.
- The existing FNV-1a checksum detects accidental corruption only. It is not authentication or a tamper-proof signature.
- Physical iPhone restore testing remains separate from automated Chromium tests.

## Versioning model

- Save payload v1 and backup envelope v1 are legacy read formats.
- Save payload v2 and backup envelope v2 are the only newly written formats.
- `migrateV1ToV2(value)` is an explicit, deterministic, side-effect-free migration. It accepts only a v1-shaped record and returns a normalized v2 save; unknown versions are rejected by the backup reader.
- The Dexie database advances from schema version 1 to 2. Its upgrade transaction migrates both the active save and recovery snapshot atomically.
- V1 JSON backups are checksum-verified against their original payload before validation and migration. The original bytes are never reserialized before checksum verification.

## V2 campaign payload

V2 retains the current progression fields and adds one bounded `campaign` object:

- `chapterProgress`: one record per currently registered chapter/planet, with attempts, clears, best score and last-played timestamp. Existing `completedPlanets` remains the source used by current unlock logic.
- `decisions`: normalized records keyed by pilot, chapter and decision ID. The current `storyChoices` map remains a compatibility mirror for the existing one-choice-per-scene UI. Current decision registry: `planet-opening` → `follow-signal | protect-crew`; future decisions must be registered before they can be imported.
- `routeProgress`: attempts, clears, best score and last-played timestamp per pilot × chapter × route. Distinct routes retain distinct records; replaying one route never deletes another route's record.
- `unlockedSecretRouteIds`: explicit allowlist, initially `celestial-echo`, derived consistently with the existing secret-route flag.
- `unlockedEndingIds` / `viewedEndingIds`: separate bounded registries. No ending IDs are currently authored, so both normalize to empty until real ending content and IDs are added.
- `lastReplay`: the last completed run's pilot, chapter, route, outcome, attempt number and timestamp. V1 had no reliable run-history metadata, so migration initializes this to `null`; it must not infer a last run from menu selections.

A chapter's canonical completion/unlock state stays in the existing `completedPlanets` list in this milestone. Campaign counters are historical metadata, not a competing authority for progression.

## Migration rules

- Preserve all valid v1 currency, upgrades, scores, settings, unlocked ships/pilots/weapons/skins, equipped weapons, pilot XP/skills, story choices/flags, planet progression, achievements, boss collection and high scores.
- V1 story choices become `planet-opening` decision records with timestamp 0 (unknown legacy time).
- If v1 has a completed planet, seed the corresponding chapter's `attempts` and `clears` to 1 as a conservative known lower bound. Do not invent repeat counts, scores or timestamps.
- Map the existing `celestial-echo` story flag to the v2 secret-route registry. Do not mislabel it as an ending.
- Default absent campaign data safely. A v2 payload with malformed campaign data is rejected by backup validation; local-save sanitation falls back to a safe normalized state.

## Import/export and failure atomicity

- V2 export serializes the normalized v2 payload, includes the v2 envelope version and checksum, and downloads as `starlight-wing-save-v2.json`.
- Import accepts v1 and v2 only. It checks file size, JSON/envelope version, checksum, strict schema and semantic IDs before calling persistence.
- A malformed or unsupported backup never calls `restoreSave`.
- Restore reads the prior save and writes both the recovery snapshot and imported save inside one Dexie read-write transaction. The in-memory save changes only after transaction success. If any write fails, IndexedDB rolls back and the active in-memory save remains unchanged.
- Backup checksums are integrity checks, not a security boundary. Zod bounds, finite ID registries and semantic normalization are the trust boundary.

## Replay semantics

- Replay history is append/update metadata, not a reset of story choices or progression.
- A route record is keyed by pilot + chapter + route, so alternate routes do not overwrite each other.
- Replaying a route increments that route's attempt count; a clear increments its clear count and updates best score. Other routes, unlocks, currency and achievements are retained.
- The saved `storyChoices` continue to represent the current canonical story selection. A future replay UI may pass a different route explicitly and store its stats without overwriting that canonical choice.
- New ending and secret-route identifiers are accepted only after being added to the corresponding source registry.

## Acceptance criteria

1. A valid legacy v1 backup restores to the same progression in v2.
2. A v2 backup round-trips all campaign fields.
3. V1 checksum verification remains byte-for-byte compatible.
4. Unknown chapters, pilots, decisions, route IDs, secret-route IDs and ending IDs are discarded.
5. Unsupported versions, bad checksums, malformed JSON and oversized files are rejected before persistence is called.
6. A failed restore transaction leaves both the active save and recovery snapshot unchanged.
7. Dexie v1→v2 migration covers both `saves` and `recovery` stores.
8. Unit tests, production TypeScript/PWA build and Playwright backup-transfer tests pass. Browser automation is not described as physical-device certification.

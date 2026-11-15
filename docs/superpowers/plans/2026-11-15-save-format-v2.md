# Save Format v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Starlight Wing persistence to v2 while retaining v1 local-save and backup compatibility and guaranteeing that failed imports do not mutate active progress.

**Architecture:** Keep existing gameplay-facing save fields, add a bounded `campaign` namespace, and centralize migration/normalization in `src/game/core.ts`. Dexie schema v2 migrates active and recovery records in one upgrade transaction; backup restore validates completely before a single atomic read/write transaction.

**Tech Stack:** TypeScript, Zod 4, Dexie 4, Vitest 4, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-15-save-format-v2.md`

## Global Constraints

- No paid service, cloud account, remote save, analytics or external API.
- V1 payloads and checksums remain readable; new writes use v2.
- Unknown progression IDs are removed through finite game-owned registries.
- An invalid import must not call persistence; a failed IndexedDB restore must roll back.
- Do not claim physical iPhone certification from GitHub Actions.

## Review Focus

- Legacy v1 backup checksum changes during migration → test checksum before parse/migration and keep the known v1 fixture.
- V2 payload with forged chapter/route/ending/decision IDs → test every registry boundary.
- V2 backup with an invalid nested field or unknown key → strict schema rejection.
- Database write failure during restore → verify both save/recovery writes share one transaction and memory assignment occurs only after commit.
- V1 saves with a completed planet but no history → test conservative lower-bound migration and null lastReplay.

---

### Task 1: Specify and test the v2 contract

**Files:**
- Create: `docs/superpowers/specs/2026-11-15-save-format-v2.md`
- Create: `tests/save-v2.test.ts`

**Interfaces:**
- `migrateV1ToV2(value: unknown): SaveData | null`
- `SaveData.version: 2`
- `SaveData.campaign` contains `chapterProgress`, `decisions`, `routeProgress`, `unlockedSecretRouteIds`, `unlockedEndingIds`, `viewedEndingIds`, and `lastReplay`.

- [ ] Write tests for v1→v2 preservation, legacy secret-route mapping, null legacy replay metadata, v2 backup round-trip, ID rejection and per-route replay counters.
- [ ] Commit the tests before production implementation; inspect the GitHub Actions failure to confirm the tests fail for missing v2 behavior, not malformed test code.

### Task 2: Implement v2 types, schemas and deterministic migration

**Files:**
- Modify: `src/game/core.ts`
- Modify: `src/game/narrative.ts`

**Interfaces:**
- `migrateV1ToV2(value: unknown): SaveData | null` returns null unless input version is exactly 1.
- `sanitizeSaveData(value: unknown): SaveData` accepts v1 or v2 and always returns normalized v2.
- `recordCampaignRunResult(value, event): SaveData` updates chapter, route and last-replay metadata without erasing choices or other routes.
- `isStoryChoiceId(value: string): value is StoryChoiceId` centralizes current choice validation.

- [ ] Add tests first for deterministic migration and semantic ID filtering.
- [ ] Add bounded Zod campaign schemas and registries for current chapters, decisions, routes, secret routes and endings.
- [ ] Normalize legacy `storyChoices` into the v2 `planet-opening` decision records.
- [ ] Implement the pure `recordCampaignRunResult` update API and verify the test cases.
- [ ] Preserve the previous sanitizer's behavior for all existing v1 fields.

### Task 3: Version the portable backup format and guard imports

**Files:**
- Modify: `src/game/core.ts`
- Modify: `src/persistence/backup.ts`
- Create/modify: `tests/save-v2.test.ts`

**Interfaces:**
- `createBackup(value)` emits envelope and payload version 2.
- `verifyBackup(serialized)` returns normalized v2 for valid v1/v2 envelopes and null otherwise.
- `importBackup(file)` verifies size, checksum and schema before invoking `restoreSave`.

- [ ] Verify the legacy v1 checksum fixture remains accepted.
- [ ] Verify tampered, oversized, malformed and unsupported-version files are rejected.
- [ ] Verify invalid imports do not call `restoreSave`.
- [ ] Change the exported filename to `starlight-wing-save-v2.json`.

### Task 4: Upgrade Dexie and make restore atomic

**Files:**
- Modify: `src/persistence/database.ts`
- Modify: `tests/save-v2.test.ts` or persistence tests.

**Interfaces:**
- Database schema v2 upgrades both `saves` and `recovery` rows using `sanitizeSaveData`.
- `restoreSave(value)` writes the previous snapshot and imported save in one read-write transaction; `memorySave` is assigned only after transaction commit.

- [ ] Confirm Dexie upgrade API against current docs.
- [ ] Implement v1→v2 data migration for both stores.
- [ ] Move previous-save read into the restore transaction.
- [ ] Run tests and inspect failure paths; no cloud storage is introduced.

### Task 5: End-to-end and documentation gate

**Files:**
- Modify: `tests/e2e/app.spec.ts`
- Modify: `docs/architecture/tool-roles.md`
- Modify: `docs/qa/iphone-field-test.md`

- [ ] Add a transfer regression that accepts a v1 backup and exports a v2 backup that restores in a fresh browser context.
- [ ] Record the division of responsibilities and free-tier limits for GitHub, Context7, Superpowers, Dexie, Zod, Vitest and Playwright; retain non-applicable visual/cloud tools as optional and disabled.
- [ ] Run `npm test`, `npm run build`, and `npm run test:e2e` in GitHub Actions.
- [ ] Review the final diff for data loss, schema looseness, non-atomic writes and incorrect completion claims.

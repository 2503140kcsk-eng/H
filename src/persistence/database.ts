import Dexie, { type Table } from "dexie";
import { createDefaultSave, sanitizeSaveData, type SaveData } from "../game/core";

type SaveRecord = { id: "pilot"; data: SaveData; updatedAt: number };
type RecoveryRecord = { id: "latest"; data: SaveData; createdAt: number };

class StarlightDatabase extends Dexie {
  saves!: Table<SaveRecord, string>;
  recovery!: Table<RecoveryRecord, string>;

  constructor() {
    super("starlight-wing");
    this.version(1).stores({
      saves: "id, updatedAt",
      recovery: "id, createdAt"
    });
    this.version(2).stores({
      saves: "id, updatedAt",
      recovery: "id, createdAt"
    }).upgrade(async (transaction) => {
      const saves = transaction.table("saves") as Table<SaveRecord, string>;
      const recovery = transaction.table("recovery") as Table<RecoveryRecord, string>;
      await Promise.all([
        saves.toCollection().modify((record) => {
          record.data = sanitizeSaveData(record.data);
        }),
        recovery.toCollection().modify((record) => {
          record.data = sanitizeSaveData(record.data);
        })
      ]);
    });
  }
}

const database = new StarlightDatabase();
let memorySave = createDefaultSave();
export type SavePersistenceStatus = "unknown" | "persistent" | "memory-only";
let persistenceStatus: SavePersistenceStatus = "unknown";

export function getSavePersistenceStatus(): SavePersistenceStatus {
  return persistenceStatus;
}

export async function loadSave(): Promise<SaveData> {
  try {
    const row = await database.saves.get("pilot");
    if (row?.data) memorySave = sanitizeSaveData(row.data);
    persistenceStatus = "persistent";
  } catch {
    // Private browsing or disabled IndexedDB: continue this session in memory.
    persistenceStatus = "memory-only";
  }
  return structuredClone(memorySave);
}

export async function saveProgress(value: unknown): Promise<SaveData> {
  const safe = sanitizeSaveData(value);
  memorySave = safe;
  try {
    await database.saves.put({ id: "pilot", data: safe, updatedAt: Date.now() });
    persistenceStatus = "persistent";
  } catch {
    // Keep the current run playable, but make the lack of durable storage visible.
    persistenceStatus = "memory-only";
  }
  return structuredClone(safe);
}

export async function restoreSave(value: unknown): Promise<SaveData> {
  const safe = sanitizeSaveData(value);
  // The loaded in-memory save is the active session state. Do not reload it
  // from IndexedDB here: that could replace newer memory-only progress with a
  // stale disk row immediately before a restore that later fails.
  const previous = structuredClone(memorySave);
  const timestamp = Date.now();
  try {
    await database.transaction("rw", database.saves, database.recovery, async () => {
      await database.recovery.put({ id: "latest", data: previous, createdAt: timestamp });
      await database.saves.put({ id: "pilot", data: safe, updatedAt: timestamp });
    });
  } catch (error) {
    persistenceStatus = "memory-only";
    // IndexedDB rolls back both writes. memorySave is intentionally untouched.
    throw new Error("復元を保存できませんでした。既存データは変更していません。", { cause: error });
  }
  persistenceStatus = "persistent";
  memorySave = safe;
  return structuredClone(safe);
}

export async function loadRecoveryBackup(): Promise<SaveData | null> {
  try {
    const row = await database.recovery.get("latest");
    return row?.data ? sanitizeSaveData(row.data) : null;
  } catch {
    return null;
  }
}

export async function closeDatabase(): Promise<void> {
  database.close();
}

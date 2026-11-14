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
  const previous = await loadSave();
  try {
    await database.transaction("rw", database.saves, database.recovery, async () => {
      await database.recovery.put({ id: "latest", data: previous, createdAt: Date.now() });
      await database.saves.put({ id: "pilot", data: safe, updatedAt: Date.now() });
    });
  } catch (error) {
    persistenceStatus = "memory-only";
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

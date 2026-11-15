
import Dexie, { type Table } from "dexie";
import { createDefaultSave, sanitizeSaveData, type SaveData } from "../game/core";

type SaveRecord = { id: "pilot"; data: SaveData; updatedAt: number };
type RecoveryRecord = { id: "latest"; data: SaveData; createdAt: number };
type PilotModelRecord = { id: string; blob: Blob; fileName: string; updatedAt: number };

class StarlightDatabase extends Dexie {
  saves!: Table<SaveRecord, string>;
  recovery!: Table<RecoveryRecord, string>;
  pilotModels!: Table<PilotModelRecord, string>;

  constructor() {
    super("starlight-wing");
    this.version(1).stores({
      saves: "id, updatedAt",
      recovery: "id, createdAt"
    });
    this.version(2).stores({
      saves: "id, updatedAt",
      recovery: "id, createdAt",
      pilotModels: "id, updatedAt"
    });
  }
}

const database = new StarlightDatabase();
const memoryPilotModels = new Map<string, PilotModelRecord>();
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

export async function savePilotModel(pilotId: string, blob: Blob, fileName: string): Promise<boolean> {
  const record: PilotModelRecord = {
    id: pilotId,
    blob,
    fileName: fileName.slice(0, 120),
    updatedAt: Date.now()
  };
  memoryPilotModels.set(pilotId, record);
  try {
    await database.pilotModels.put(record);
    return true;
  } catch {
    return false;
  }
}

export async function loadPilotModel(pilotId: string): Promise<{ blob: Blob; fileName: string } | null> {
  try {
    const record = await database.pilotModels.get(pilotId);
    if (record) {
      memoryPilotModels.set(pilotId, record);
      return { blob: record.blob, fileName: record.fileName };
    }
  } catch {
    // Private browsing / storage denial falls back to the current page session.
  }
  const fallback = memoryPilotModels.get(pilotId);
  return fallback ? { blob: fallback.blob, fileName: fallback.fileName } : null;
}

export async function removePilotModel(pilotId: string): Promise<void> {
  memoryPilotModels.delete(pilotId);
  try {
    await database.pilotModels.delete(pilotId);
  } catch {
    // A failed delete is harmless for the current page session; no network data exists.
  }
}

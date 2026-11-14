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

export async function loadSave(): Promise<SaveData> {
  try {
    const row = await database.saves.get("pilot");
    if (row?.data) memorySave = sanitizeSaveData(row.data);
  } catch {
    // Private browsing or disabled IndexedDB: continue this session in memory.
  }
  return structuredClone(memorySave);
}

export async function saveProgress(value: unknown): Promise<SaveData> {
  const safe = sanitizeSaveData(value);
  memorySave = safe;
  try {
    await database.saves.put({ id: "pilot", data: safe, updatedAt: Date.now() });
  } catch {
    // The game remains playable; the UI can still export a portable backup.
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
    throw new Error("復元を保存できませんでした。既存データは変更していません。", { cause: error });
  }
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

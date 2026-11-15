import { createBackup, verifyBackup, type SaveData } from "../game/core";
import { restoreSave } from "./database";

export function exportBackup(data: SaveData): void {
  const blob = new Blob([createBackup(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "starlight-wing-save-v2.json";
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Safari/iOS may not have consumed the object URL at the instant click() returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function importBackup(file: File): Promise<SaveData> {
  if (file.size > 1_000_000) throw new Error("バックアップが大きすぎます。");
  const parsed = verifyBackup(await file.text());
  if (!parsed) throw new Error("バックアップの形式またはチェックサムが正しくありません。既存データは変更していません。");
  return restoreSave(parsed);
}

export const MAX_PILOT_VRM_BYTES = 32 * 1024 * 1024;

export type VrmFileValidation =
  | { valid: true }
  | { valid: false; reason: string };

export function validateVrmFile(file: Pick<File, "name" | "size">): VrmFileValidation {
  const name = file.name.trim();
  if (!name.toLowerCase().endsWith(".vrm")) {
    return { valid: false, reason: "VRM形式（.vrm）のファイルを選んでください。" };
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return { valid: false, reason: "ファイルが空か、サイズを確認できません。" };
  }
  if (file.size > MAX_PILOT_VRM_BYTES) {
    return { valid: false, reason: "iPhoneのメモリを守るため、VRMは32 MiB以下にしてください。" };
  }
  return { valid: true };
}

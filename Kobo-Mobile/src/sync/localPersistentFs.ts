import {
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  readDirectoryAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";

/** App-private folder under documentDirectory (survives until uninstall). */
const STORAGE_ROOT = "kobo-storage";

export function getDocumentsStorageUnavailableReason(): string | null {
  if (documentDirectory) {
    return null;
  }
  return "Device storage is not available in this environment. Use an Android/iOS build (including Expo Go on a phone), not web.";
}

async function ensureDirectory(uri: string): Promise<void> {
  const info = await getInfoAsync(uri);
  if (!info.exists) {
    await makeDirectoryAsync(uri, { intermediates: true });
  }
}

/** Returns `${documentDirectory}kobo-storage/<segment>/` or `null` if unavailable (e.g. some web runs). */
export function storageDir(segment: string): string | null {
  const base = documentDirectory;
  if (!base) {
    return null;
  }
  return `${base}${STORAGE_ROOT}/${segment}/`;
}

export async function ensureStorageSegment(segment: string): Promise<string> {
  const dir = storageDir(segment);
  if (!dir) {
    throw new Error(getDocumentsStorageUnavailableReason() ?? "Storage unavailable");
  }
  await ensureDirectory(dir);
  return dir;
}

export async function writeJsonFile(dir: string, filename: string, payload: unknown): Promise<void> {
  const path = `${dir}${filename}`;
  await writeAsStringAsync(path, JSON.stringify(payload));
}

export async function readJsonFile<T>(fileUri: string): Promise<T | null> {
  try {
    const raw = await readAsStringAsync(fileUri);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function deleteFileIfExists(fileUri: string): Promise<void> {
  const info = await getInfoAsync(fileUri);
  if (info.exists) {
    await deleteAsync(fileUri, { idempotent: true });
  }
}

export async function listJsonFilesInDir(dir: string): Promise<string[]> {
  const info = await getInfoAsync(dir);
  if (!info.exists) {
    return [];
  }
  const names = await readDirectoryAsync(dir);
  return names.filter((n) => n.endsWith(".json"));
}

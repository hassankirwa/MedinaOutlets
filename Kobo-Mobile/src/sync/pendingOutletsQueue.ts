import { getInfoAsync } from "expo-file-system/legacy";
import type { NewOutletDraft } from "../domain/newOutletTypes";
import {
  deleteFileIfExists,
  ensureStorageSegment,
  listJsonFilesInDir,
  readJsonFile,
  storageDir,
  writeJsonFile,
} from "./localPersistentFs";

const SEGMENT = "pending-outlets";

export type PendingOutletRecord = {
  localId: string;
  userId: number;
  draft: NewOutletDraft;
  submittedAt: string;
  submittedBy: string;
  /** Same key as used / to use for `client_submission_key` on the API (offline queue & retries). */
  clientSubmissionKey?: string;
};

function fileNameForLocalId(localId: string): string {
  const safe = localId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safe}.json`;
}

export async function enqueuePendingOutlet(record: PendingOutletRecord): Promise<void> {
  const dir = await ensureStorageSegment(SEGMENT);
  const path = `${dir}${fileNameForLocalId(record.localId)}`;
  const info = await getInfoAsync(path);
  if (info.exists) {
    return;
  }
  await writeJsonFile(dir, fileNameForLocalId(record.localId), record);
}

export async function removePendingOutlet(localId: string): Promise<void> {
  const dir = storageDir(SEGMENT);
  if (!dir) {
    return;
  }
  await deleteFileIfExists(`${dir}${fileNameForLocalId(localId)}`);
}

export async function listPendingOutletsForUser(userId: number): Promise<PendingOutletRecord[]> {
  const dir = storageDir(SEGMENT);
  if (!dir) {
    return [];
  }
  try {
    const names = await listJsonFilesInDir(dir);
    const rows: PendingOutletRecord[] = [];
    for (const name of names) {
      const row = await readJsonFile<PendingOutletRecord>(`${dir}${name}`);
      if (row && row.userId === userId) {
        rows.push(row);
      }
    }
    return rows;
  } catch {
    return [];
  }
}

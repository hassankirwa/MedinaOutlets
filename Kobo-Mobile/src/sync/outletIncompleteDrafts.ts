import type { NewOutletDraft } from "../domain/newOutletTypes";
import {
  deleteFileIfExists,
  ensureStorageSegment,
  listJsonFilesInDir,
  readJsonFile,
  storageDir,
  writeJsonFile,
} from "./localPersistentFs";

const SEGMENT = "incomplete-outlet-drafts";

export type NewOutletResumeScreen =
  | "newOutletPickProject"
  | "newOutlet1"
  | "newOutlet2"
  | "newOutlet3"
  | "newOutlet4"
  | "newOutlet5";

export type SavedIncompleteOutletDraft = {
  id: string;
  userId: number;
  draft: NewOutletDraft;
  resumeScreen: NewOutletResumeScreen;
  savedAt: string;
};

function fileNameForId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safe}.json`;
}

export async function listIncompleteDraftsForUser(userId: number): Promise<SavedIncompleteOutletDraft[]> {
  const dir = storageDir(SEGMENT);
  if (!dir) {
    return [];
  }
  try {
    const names = await listJsonFilesInDir(dir);
    const rows: SavedIncompleteOutletDraft[] = [];
    for (const name of names) {
      const row = await readJsonFile<SavedIncompleteOutletDraft>(`${dir}${name}`);
      if (row && row.userId === userId) {
        rows.push(row);
      }
    }
    return rows.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  } catch {
    return [];
  }
}

export async function upsertIncompleteDraft(record: SavedIncompleteOutletDraft): Promise<void> {
  const dir = await ensureStorageSegment(SEGMENT);
  await writeJsonFile(dir, fileNameForId(record.id), record);
}

export async function removeIncompleteDraft(id: string): Promise<void> {
  const dir = storageDir(SEGMENT);
  if (!dir) {
    return;
  }
  await deleteFileIfExists(`${dir}${fileNameForId(id)}`);
}

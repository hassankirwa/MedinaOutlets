import { apiCreateOutlet } from "../api/client";
import type { SubmittedOutlet } from "../domain/newOutletTypes";
import { randomClientSubmissionKey } from "../utils/randomClientSubmissionKey";
import { isLikelyNetworkError } from "./network";
import { listPendingOutletsForUser, removePendingOutlet } from "./pendingOutletsQueue";

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Upload failed";
}

export async function flushPendingOutletsForUser(
  token: string,
  userId: number,
  replaceSubmissionAfterSync: (localId: string, synced: SubmittedOutlet) => void,
  onPermanentFailure?: (localId: string, message: string) => void,
): Promise<{ syncedCount: number; stoppedForNetwork: boolean }> {
  const pending = await listPendingOutletsForUser(userId);
  let syncedCount = 0;

  for (const record of pending) {
    try {
      const key = record.clientSubmissionKey ?? randomClientSubmissionKey();
      const created = await apiCreateOutlet(token, record.draft, key);

      await removePendingOutlet(record.localId);
      replaceSubmissionAfterSync(record.localId, {
        ...record.draft,
        id: created.id,
        submittedAt: record.submittedAt,
        submittedBy: record.submittedBy,
        syncStatus: "synced",
      });
      syncedCount += 1;
    } catch (e) {
      if (isLikelyNetworkError(e)) {
        return { syncedCount, stoppedForNetwork: true };
      }
      await removePendingOutlet(record.localId);
      onPermanentFailure?.(record.localId, errorMessage(e));
      return { syncedCount, stoppedForNetwork: false };
    }
  }

  return { syncedCount, stoppedForNetwork: false };
}

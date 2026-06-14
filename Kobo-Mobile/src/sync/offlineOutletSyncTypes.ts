export type OfflineOutletSyncRunResult =
  | { outcome: "no_session" }
  | { outcome: "offline" }
  | { outcome: "busy" }
  | {
      outcome: "complete";
      syncedCount: number;
      failedCount: number;
      stoppedForNetwork: boolean;
      pendingCountBefore: number;
      pendingCountAfter: number;
    };

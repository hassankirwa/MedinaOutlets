export type OfflineOutletSyncRunResult =
  | { outcome: "no_session" }
  | { outcome: "offline" }
  | { outcome: "busy" }
  | {
      outcome: "complete";
      syncedCount: number;
      stoppedForNetwork: boolean;
      pendingCountBefore: number;
    };

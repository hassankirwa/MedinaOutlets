import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createDefaultNewOutletDraft } from "../domain/newOutletDefaults";
import type { NewOutletDraft, OutletPhoto, SubmittedOutlet } from "../domain/newOutletTypes";
import { listPendingOutletsForUser } from "../sync/pendingOutletsQueue";

export type { NewOutletDraft, OutletPhoto, SubmittedOutlet } from "../domain/newOutletTypes";

function defaultDraft(): NewOutletDraft {
  return createDefaultNewOutletDraft();
}

type DraftContextValue = {
  draft: NewOutletDraft;
  setDraft: Dispatch<SetStateAction<NewOutletDraft>>;
  updateDraft: (patch: Partial<NewOutletDraft>) => void;
  resetDraft: () => void;
  submittedOutlets: SubmittedOutlet[];
  submitDraft: () => SubmittedOutlet;
  addSubmitted: (submission: SubmittedOutlet) => void;
  hydratePendingForUser: (userId: number) => Promise<void>;
  replaceSubmissionAfterSync: (localId: string, synced: SubmittedOutlet) => void;
  removeSubmission: (localId: string) => void;
  clearLocalSubmissions: () => void;
  /** Replace synced rows from GET /api/outlets; keeps offline-pending rows. */
  mergeRemoteSubmissions: (remote: SubmittedOutlet[]) => void;
};

const NewOutletDraftContext = createContext<DraftContextValue | null>(null);

export function NewOutletDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<NewOutletDraft>(defaultDraft);
  const [submittedOutlets, setSubmittedOutlets] = useState<SubmittedOutlet[]>([]);

  const updateDraft = useCallback((patch: Partial<NewOutletDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(defaultDraft());
  }, []);

  const submitDraft = useCallback((): SubmittedOutlet => {
    const submission: SubmittedOutlet = {
      ...draft,
      id: `outlet-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      submittedAt: new Date().toISOString(),
      submittedBy: "John Mwangi",
      syncStatus: "synced",
    };
    setSubmittedOutlets((prev) => [submission, ...prev]);
    return submission;
  }, [draft]);

  const addSubmitted = useCallback((submission: SubmittedOutlet) => {
    setSubmittedOutlets((prev) => [submission, ...prev]);
  }, []);

  const hydratePendingForUser = useCallback(async (userId: number) => {
    const rows = await listPendingOutletsForUser(userId);
    setSubmittedOutlets((prev) => {
      const ids = new Set(prev.map((s) => s.id));
      const additions: SubmittedOutlet[] = rows
        .filter((r) => !ids.has(r.localId))
        .map((r) => ({
          ...r.draft,
          id: r.localId,
          submittedAt: r.submittedAt,
          submittedBy: r.submittedBy,
          syncStatus: "pending" as const,
        }));
      return [...additions, ...prev];
    });
  }, []);

  const replaceSubmissionAfterSync = useCallback((localId: string, synced: SubmittedOutlet) => {
    setSubmittedOutlets((prev) =>
      prev.map((s) =>
        s.id === localId ? { ...synced, syncStatus: "synced" as const } : s,
      ),
    );
  }, []);

  const removeSubmission = useCallback((localId: string) => {
    setSubmittedOutlets((prev) => prev.filter((s) => s.id !== localId));
  }, []);

  const clearLocalSubmissions = useCallback(() => {
    setSubmittedOutlets([]);
  }, []);

  const mergeRemoteSubmissions = useCallback((remote: SubmittedOutlet[]) => {
    setSubmittedOutlets((prev) => {
      const pending = prev.filter((s) => s.syncStatus === "pending");
      const merged = [...remote, ...pending];
      merged.sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
      return merged;
    });
  }, []);

  const value = useMemo(
    () => ({
      draft,
      setDraft,
      updateDraft,
      resetDraft,
      submittedOutlets,
      submitDraft,
      addSubmitted,
      hydratePendingForUser,
      replaceSubmissionAfterSync,
      removeSubmission,
      clearLocalSubmissions,
      mergeRemoteSubmissions,
    }),
    [
      draft,
      setDraft,
      updateDraft,
      resetDraft,
      submittedOutlets,
      submitDraft,
      addSubmitted,
      hydratePendingForUser,
      replaceSubmissionAfterSync,
      removeSubmission,
      clearLocalSubmissions,
      mergeRemoteSubmissions,
    ],
  );

  return <NewOutletDraftContext.Provider value={value}>{children}</NewOutletDraftContext.Provider>;
}

export function useNewOutletDraft(): DraftContextValue {
  const ctx = useContext(NewOutletDraftContext);
  if (!ctx) {
    throw new Error("useNewOutletDraft must be used within NewOutletDraftProvider");
  }
  return ctx;
}

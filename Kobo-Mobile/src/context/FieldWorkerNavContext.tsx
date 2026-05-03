import { createContext, useContext, type ReactNode } from "react";

export type FieldWorkerNavActions = {
  goHome: () => void;
  goProjects: () => void;
  goSubmissions: () => void;
  goProfile: () => void;
  requestNewOutlet: () => void;
};

const FieldWorkerNavContext = createContext<FieldWorkerNavActions | null>(null);

export function FieldWorkerNavProvider({
  value,
  children,
}: {
  value: FieldWorkerNavActions;
  children: ReactNode;
}) {
  return <FieldWorkerNavContext.Provider value={value}>{children}</FieldWorkerNavContext.Provider>;
}

export function useFieldWorkerNavActions(): FieldWorkerNavActions {
  const ctx = useContext(FieldWorkerNavContext);
  if (!ctx) {
    throw new Error("Field worker navigation is not available (missing FieldWorkerNavProvider).");
  }
  return ctx;
}

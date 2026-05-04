"use client";

import * as React from "react";
import { AdminSidebar } from "./AdminSidebar";

export type AdminChrome = {
  isSidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  closeSidebar: () => void;
};

const AdminChromeContext = React.createContext<AdminChrome | null>(null);

export function useAdminChrome(): AdminChrome {
  const ctx = React.useContext(AdminChromeContext);
  if (!ctx) {
    throw new Error("useAdminChrome must be used within AdminShell");
  }
  return ctx;
}

export function AdminShell({
  children,
}: {
  children: React.ReactNode | ((chrome: AdminChrome) => React.ReactNode);
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsSidebarOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const value = React.useMemo(
    () => ({
      isSidebarOpen,
      setSidebarOpen: setIsSidebarOpen,
      toggleSidebar: () => setIsSidebarOpen((p) => !p),
      closeSidebar: () => setIsSidebarOpen(false),
    }),
    [isSidebarOpen],
  );

  return (
    <AdminChromeContext.Provider value={value}>
      <div className="flex max-h-dvh min-h-0 h-dvh flex-col overflow-hidden bg-slate-50">
        <div className="relative flex min-h-0 min-w-0 flex-1">
          <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          {isSidebarOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-slate-900/35 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close menu"
            />
          ) : null}
          <main
            className={[
              "min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-6 transition-[margin] duration-300 sm:px-6",
              isSidebarOpen ? "lg:ml-[280px]" : "lg:ml-[84px]",
            ].join(" ")}
          >
            {typeof children === "function" ? children(value) : children}
          </main>
        </div>
      </div>
    </AdminChromeContext.Provider>
  );
}

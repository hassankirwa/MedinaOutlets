"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  clearAllNotifications,
  fetchNotificationUnreadCount,
  fetchNotificationsPage,
  markAllNotificationsRead,
  markNotificationRead,
  type InAppNotificationRow,
} from "@/lib/api";

type NotificationBellProps = {
  className?: string;
  pollMs?: number;
};

export function NotificationBell({ className = "", pollMs = 60_000 }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [count, setCount] = React.useState(0);
  const [items, setItems] = React.useState<InAppNotificationRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const refreshCount = React.useCallback(async () => {
    try {
      const n = await fetchNotificationUnreadCount();
      setCount(n);
    } catch {
      /* ignore */
    }
  }, []);

  const loadList = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotificationsPage({ per_page: 20 });
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshCount();
    const id = window.setInterval(() => void refreshCount(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refreshCount]);

  React.useEffect(() => {
    if (open) {
      void loadList();
      void refreshCount();
    }
  }, [open, loadList, refreshCount]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };

  const handleNavigate = async (n: InAppNotificationRow) => {
    if (!n.read_at) {
      try {
        await markNotificationRead(n.id);
      } catch {
        /* ignore */
      }
      void refreshCount();
    }
    setOpen(false);
    if (n.action_path) {
      router.push(n.action_path);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      void refreshCount();
      void loadList();
    } catch {
      /* ignore */
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await clearAllNotifications();
      setItems([]);
      setCount(0);
      void refreshCount();
    } catch {
      /* ignore */
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className={`relative ${className}`.trim()} ref={wrapRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,360px)] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <span className="text-[12px] font-semibold text-slate-800">Notifications</span>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50"
                onClick={() => void handleMarkAll()}
              >
                Mark read
              </button>
              <button
                type="button"
                disabled={clearing || items.length === 0}
                className="rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => void handleClearAll()}
                title="Remove all notifications"
              >
                {clearing ? "…" : "Clear"}
              </button>
            </div>
          </div>
          <div className="max-h-[min(70vh,320px)] overflow-y-auto">
            {loading ? (
              <div className="px-3 py-6 text-center text-[12px] text-slate-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-6 text-center text-[12px] text-slate-500">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleNavigate(n)}
                  className={[
                    "flex w-full flex-col gap-0.5 border-b border-slate-50 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50",
                    n.read_at ? "opacity-75" : "bg-emerald-50/40",
                  ].join(" ")}
                >
                  <span className="text-[12px] font-semibold text-slate-900">{n.title}</span>
                  <span className="text-[11px] leading-snug text-slate-600">{n.body}</span>
                  {n.page_key ? (
                    <span className="text-[10px] text-slate-400">Area: {n.page_key}</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

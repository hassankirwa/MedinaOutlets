import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { apiNotificationUnreadCount } from "../api/client";

const POLL_MS = 60_000;

export function useNotificationUnreadCount(token: string | null): {
  count: number;
  refresh: () => Promise<void>;
} {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!token) {
      setCount(0);
      return;
    }
    try {
      const n = await apiNotificationUnreadCount(token);
      setCount(n);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refresh();
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [refresh]);

  return { count, refresh };
}

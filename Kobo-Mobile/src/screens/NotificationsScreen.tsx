import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  apiFetchNotifications,
  apiMarkAllNotificationsRead,
  apiMarkNotificationRead,
  type InAppNotificationRow,
} from "../api/client";
import { font } from "../theme/fonts";
import type { MobileNotificationPayload } from "../notifications/types";

function formatWhen(iso: string | null): string {
  if (!iso) {
    return "";
  }
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function rowToPayload(row: InAppNotificationRow): MobileNotificationPayload {
  return {
    mobile_screen: row.mobile_screen ?? null,
    mobile_params: row.mobile_params ?? null,
    entity_type: row.entity_type ?? null,
    entity_id: row.entity_id ?? null,
  };
}

type Props = {
  token: string | null;
  onBack: () => void;
  onOpenPayload: (payload: MobileNotificationPayload) => void;
  onUnreadChanged?: () => void;
};

export function NotificationsScreen({ token, onBack, onOpenPayload, onUnreadChanged }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<InAppNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      return;
    }
    const rows = await apiFetchNotifications(token, { per_page: 30 });
    setItems(rows);
  }, [token]);

  useEffect(() => {
    setLoading(true);
    void load()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      setItems([]);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const openRow = useCallback(
    async (row: InAppNotificationRow) => {
      if (!token) {
        return;
      }
      if (!row.read_at) {
        try {
          await apiMarkNotificationRead(token, row.id);
          setItems((prev) =>
            prev.map((x) => (x.id === row.id ? { ...x, read_at: new Date().toISOString() } : x)),
          );
          onUnreadChanged?.();
        } catch {
          /* continue navigation */
        }
      }
      onOpenPayload(rowToPayload(row));
    },
    [token, onOpenPayload, onUnreadChanged],
  );

  const markAllRead = useCallback(async () => {
    if (!token) {
      return;
    }
    setMarkingAll(true);
    try {
      await apiMarkAllNotificationsRead(token);
      setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
      onUnreadChanged?.();
    } finally {
      setMarkingAll(false);
    }
  }, [token, onUnreadChanged]);

  const unread = items.filter((x) => !x.read_at).length;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </Text>
        </View>
        {unread > 0 ? (
          <Pressable style={styles.markAllBtn} onPress={() => void markAllRead()} disabled={markingAll}>
            {markingAll ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.markAllText}>Mark all</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#178E47" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        >
          {items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>
                Submission reviews and project assignments will appear here.
              </Text>
            </View>
          ) : (
            items.map((row) => (
              <Pressable
                key={row.id}
                style={[styles.card, !row.read_at && styles.cardUnread]}
                onPress={() => void openRow(row)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{row.title}</Text>
                  {!row.read_at ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.cardBody}>{row.body}</Text>
                <Text style={styles.cardWhen}>{formatWhen(row.created_at)}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F6" },
  header: {
    backgroundColor: "#178E47",
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitleBlock: { flex: 1 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: font.extraBold },
  headerSubtitle: { color: "#DAF5E2", fontSize: 13, marginTop: 4, fontFamily: font.regular },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    minWidth: 72,
    alignItems: "center",
  },
  markAllText: { color: "#FFFFFF", fontFamily: font.semiBold, fontSize: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 10 },
  emptyWrap: { alignItems: "center", paddingTop: 48, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: "#334155" },
  emptyBody: { fontFamily: font.regular, fontSize: 14, color: "#64748B", textAlign: "center" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  cardUnread: { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { flex: 1, fontFamily: font.bold, fontSize: 15, color: "#0F172A" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#169447" },
  cardBody: { fontFamily: font.regular, fontSize: 14, color: "#475569", lineHeight: 20 },
  cardWhen: { fontFamily: font.regular, fontSize: 12, color: "#94A3B8", marginTop: 2 },
});

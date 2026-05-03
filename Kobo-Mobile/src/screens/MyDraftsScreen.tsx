import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiMyWardAssignments, type AuthUser, type MyWardAssignmentProject } from "../api/client";
import { FieldWorkerBottomNav } from "../components/FieldWorkerBottomNav";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { font } from "../theme/fonts";
import {
  computeAddOutletEnabled,
  FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE,
  sortAssignmentsForDisplay,
} from "../utils/fieldWorkerProjects";
import {
  listIncompleteDraftsForUser,
  removeIncompleteDraft,
  type SavedIncompleteOutletDraft,
} from "../sync/outletIncompleteDrafts";

function draftTitle(d: SavedIncompleteOutletDraft): string {
  const name = d.draft.facilityName.trim();
  if (name) {
    return name;
  }
  if (d.draft.collectionProjectName.trim()) {
    return `${d.draft.collectionProjectName} · draft`;
  }
  return "Untitled outlet draft";
}

function formatSaved(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function stepLabel(screen: SavedIncompleteOutletDraft["resumeScreen"]): string {
  switch (screen) {
    case "newOutletPickProject":
      return "Project & ward";
    case "newOutlet1":
      return "Step 1 · Classification";
    case "newOutlet2":
      return "Step 2 · Details";
    case "newOutlet3":
      return "Step 3 · Location";
    case "newOutlet4":
      return "Step 4 · Photos";
    case "newOutlet5":
      return "Step 5 · Review";
    default:
      return screen;
  }
}

export function MyDraftsScreen({
  token,
  user,
  onBack,
  onResumeDraft,
}: {
  token: string | null;
  user: AuthUser | null;
  onBack: () => void;
  onResumeDraft: (row: SavedIncompleteOutletDraft) => void;
}) {
  const insets = useSafeAreaInsets();
  const [assignments, setAssignments] = useState<MyWardAssignmentProject[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [rows, setRows] = useState<SavedIncompleteOutletDraft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setAssignments([]);
      setAssignmentsLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rowsAssignments = await apiMyWardAssignments(token);
        if (!cancelled) {
          setAssignments(sortAssignmentsForDisplay(rowsAssignments));
        }
      } catch {
        if (!cancelled) {
          setAssignments([]);
        }
      } finally {
        if (!cancelled) {
          setAssignmentsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const addOutletEnabled = useMemo(
    () => computeAddOutletEnabled(user, assignments, assignmentsLoaded),
    [user, assignments, assignmentsLoaded],
  );

  const refresh = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await listIncompleteDraftsForUser(user.id);
      setRows(list);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const confirmDelete = (row: SavedIncompleteOutletDraft) => {
    Alert.alert("Delete draft?", `Remove "${draftTitle(row)}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await removeIncompleteDraft(row.id);
            await refresh();
          })();
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <NewOutletHeader title="My Drafts" topInset={insets.top} onBack={onBack} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Incomplete outlet forms are saved here when you leave the New Outlet flow. Tap a draft to continue where you
          left off.
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#169447" />
            <Text style={styles.loadingText}>Loading drafts…</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={44} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No drafts yet</Text>
            <Text style={styles.emptyMeta}>
              When you exit New Outlet with unsaved progress, you can save to drafts and resume here.
            </Text>
          </View>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={styles.card}>
              <Pressable style={styles.cardMain} onPress={() => onResumeDraft(row)}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {draftTitle(row)}
                </Text>
                <Text style={styles.cardMeta}>{stepLabel(row.resumeScreen)}</Text>
                <Text style={styles.cardMeta}>Saved {formatSaved(row.savedAt)}</Text>
              </Pressable>
              <Pressable style={styles.trashBtn} onPress={() => confirmDelete(row)} hitSlop={10}>
                <Ionicons name="trash-outline" size={22} color="#BE123C" />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <FieldWorkerBottomNav
        active="home"
        addOutletEnabled={addOutletEnabled}
        addOutletBlockedMessage={FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7F6" },
  scroll: { padding: 16, gap: 12 },
  lead: {
    fontFamily: font.regular,
    fontSize: 14,
    color: "#475569",
    lineHeight: 21,
    marginBottom: 4,
  },
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { fontFamily: font.regular, color: "#64748B", fontSize: 14 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: { fontFamily: font.bold, fontSize: 18, color: "#0F172A" },
  emptyMeta: { fontFamily: font.regular, fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 21 },
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  cardMain: { flex: 1, padding: 16, gap: 4 },
  cardTitle: { fontFamily: font.bold, fontSize: 17, color: "#0F172A" },
  cardMeta: { fontFamily: font.regular, fontSize: 13, color: "#64748B" },
  trashBtn: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#F1F5F9",
    backgroundColor: "#FAFAFA",
  },
});

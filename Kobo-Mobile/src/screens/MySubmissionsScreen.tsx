import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  apiListMyOutlets,
  apiMyWardAssignments,
  type AuthUser,
  type MyWardAssignmentProject,
} from "../api/client";
import { OutletPhotoImage } from "../components/OutletPhotoImage";
import { FieldWorkerBottomNav } from "../components/FieldWorkerBottomNav";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import type { SubmittedOutlet } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";
import {
  computeAddOutletEnabled,
  FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE,
  sortAssignmentsForDisplay,
} from "../utils/fieldWorkerProjects";
import { outletListRowToSubmitted } from "../utils/outletApiMap";
import { getSubmissionStatus } from "../utils/submissionStatus";

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function submissionStatusUi(item: SubmittedOutlet): {
  label: string;
  pillStyle: object | undefined;
  textStyle: object | undefined;
} {
  const { label, variant } = getSubmissionStatus(item);
  switch (variant) {
    case "pending_sync":
      return { label, pillStyle: styles.statusPillPending, textStyle: styles.statusTextPending };
    case "approved":
      return { label, pillStyle: styles.statusPillApproved, textStyle: styles.statusTextApproved };
    case "rejected":
      return { label, pillStyle: styles.statusPillRejected, textStyle: styles.statusTextRejected };
    case "submitted":
    default:
      return { label, pillStyle: undefined, textStyle: undefined };
  }
}

function SubmissionCard({
  item,
  token,
  onView,
}: {
  item: SubmittedOutlet;
  token: string | null;
  onView: (id: string) => void;
}) {
  const cover = item.photos[0]?.uri;
  const status = submissionStatusUi(item);

  return (
    <View style={styles.card}>
      <OutletPhotoImage uri={cover} token={token} style={styles.thumb} placeholderIconSize={20} />
      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.facilityName || "Unnamed Facility"}</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#64748B" />
          <Text style={styles.location}>{item.physicalLocation || "No location"}</Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.statusDateRow}>
            <View style={[styles.statusPill, status.pillStyle]}>
              <Text style={[styles.statusText, status.textStyle]}>{status.label}</Text>
            </View>
            <Text style={styles.dateText}>{formatSubmittedAt(item.submittedAt)}</Text>
          </View>
          <Pressable style={styles.viewButton} onPress={() => onView(item.id)}>
            <Text style={styles.viewButtonText}>View</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function MySubmissionsScreen({
  token,
  user,
  onBack,
  onAddNewOutlet,
  onOpenSubmission,
}: {
  token: string | null;
  user: AuthUser | null;
  onBack: () => void;
  onAddNewOutlet: () => void;
  onOpenSubmission: (submissionId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { submittedOutlets, mergeRemoteSubmissions } = useNewOutletDraft();
  const [assignments, setAssignments] = useState<MyWardAssignmentProject[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) {
      setAssignments([]);
      setAssignmentsLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await apiMyWardAssignments(token);
        if (!cancelled) {
          setAssignments(sortAssignmentsForDisplay(rows));
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

  useEffect(() => {
    if (!token || !user) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setSubmissionsLoading(true);
      setSubmissionsError(null);
      try {
        const rows = await apiListMyOutlets(token);
        if (cancelled) {
          return;
        }
        const mapped = rows.map((r) => outletListRowToSubmitted(r, user.name ?? "You"));
        mergeRemoteSubmissions(mapped);
      } catch (e) {
        if (!cancelled) {
          setSubmissionsError(e instanceof Error ? e.message : "Could not load submissions");
        }
      } finally {
        if (!cancelled) {
          setSubmissionsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id, mergeRemoteSubmissions]);

  const addOutletEnabled = useMemo(
    () => computeAddOutletEnabled(user, assignments, assignmentsLoaded),
    [user, assignments, assignmentsLoaded],
  );

  const tryAddOutlet = () => {
    if (!addOutletEnabled) {
      Alert.alert("Cannot add outlet", FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE);
      return;
    }
    onAddNewOutlet();
  };

  const visibleOutlets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return submittedOutlets;
    return submittedOutlets.filter((item) => {
      const hay = `${item.facilityName} ${item.physicalLocation} ${item.typeOfAccount}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [submittedOutlets, query]);

  return (
    <View style={styles.root}>
      <NewOutletHeader title="My Submissions" topInset={insets.top} onBack={onBack} />

      <View style={styles.topWrap}>
        <Text style={styles.topText}>Below is the list of all outlets you have added.</Text>
        {submissionsError ? (
          <Text style={styles.inlineError}>{submissionsError}</Text>
        ) : null}
        {submissionsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#0F9445" />
            <Text style={styles.loadingText}>Refreshing from server…</Text>
          </View>
        ) : null}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search outlets..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
            />
          </View>
          <Pressable style={styles.searchIconButton}>
            <Ionicons name="options-outline" size={18} color="#475569" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {visibleOutlets.length === 0 ? (
          <View style={styles.emptyWrap}>
            {submissionsLoading && submittedOutlets.length === 0 && !query.trim() ? (
              <>
                <ActivityIndicator size="large" color="#0F9445" />
                <Text style={styles.emptyMeta}>Loading your submissions…</Text>
              </>
            ) : (
              <>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="file-tray-outline" size={34} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>No submissions yet</Text>
                <Text style={styles.emptyMeta}>
                  {query.trim() ? "No results match your search." : "Tap + to add your first outlet."}
                </Text>
              </>
            )}
          </View>
        ) : (
          visibleOutlets.map((item) => (
            <SubmissionCard
              key={item.id}
              item={item}
              token={token}
              onView={onOpenSubmission}
            />
          ))
        )}
      </ScrollView>

      <Pressable
        style={[
          styles.fab,
          { bottom: insets.bottom + 100 },
          !addOutletEnabled && styles.fabDisabled,
        ]}
        onPress={tryAddOutlet}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>

      <FieldWorkerBottomNav
        active="submissions"
        addOutletEnabled={addOutletEnabled}
        addOutletBlockedMessage={FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },
  topWrap: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    gap: 10,
  },
  topText: { color: "#475569", fontSize: 14, fontFamily: font.regular },
  inlineError: { color: "#B91C1C", fontSize: 13, fontFamily: font.regular },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { color: "#64748B", fontSize: 13, fontFamily: font.regular },
  searchRow: { flexDirection: "row", gap: 8 },
  searchInputWrap: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#1F2937", fontFamily: font.regular, fontSize: 15 },
  searchIconButton: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 16, gap: 10 },
  emptyWrap: {
    marginTop: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#FFF",
    borderRadius: 12,
  },
  emptyIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, color: "#334155", fontFamily: font.bold },
  emptyMeta: { fontSize: 14, color: "#64748B", fontFamily: font.regular, textAlign: "center" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 104,
  },
  thumb: { width: 78, height: 78, borderRadius: 8, backgroundColor: "#F1F5F9" },
  cardBody: { flex: 1, justifyContent: "space-between" },
  name: { fontSize: 16, color: "#1E293B", fontFamily: font.bold },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  location: { fontSize: 14, color: "#64748B", fontFamily: font.regular, flexShrink: 1 },
  bottomRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  statusDateRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" },
  statusPill: {
    borderRadius: 6,
    backgroundColor: "#E8F7EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillPending: { backgroundColor: "#FEF3C7" },
  statusPillApproved: { backgroundColor: "#D1FAE5" },
  statusPillRejected: { backgroundColor: "#FFE4E6" },
  statusText: { color: "#12914A", fontSize: 12, fontFamily: font.semiBold },
  statusTextPending: { color: "#B45309" },
  statusTextApproved: { color: "#047857" },
  statusTextRejected: { color: "#BE123C" },
  dateText: { fontSize: 12, color: "#64748B", fontFamily: font.regular },
  viewButton: {
    height: 40,
    minWidth: 68,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0F9445",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  viewButtonText: { color: "#0F9445", fontSize: 15, fontFamily: font.bold },
  fab: {
    position: "absolute",
    right: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0F9445",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 15,
  },
  fabDisabled: { opacity: 0.55 },
});

import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  apiDashboardStats,
  apiListMyOutlets,
  apiMyWardAssignments,
  type AuthUser,
  type DashboardStatsResponse,
  type MyWardAssignmentProject,
} from "../api/client";
import { FieldWorkerBottomNav } from "../components/FieldWorkerBottomNav";
import { useNewOutletDraft, type SubmittedOutlet } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";
import {
  computeAddOutletEnabled,
  FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE,
  sortAssignmentsForDisplay,
} from "../utils/fieldWorkerProjects";
import type { OfflineOutletSyncRunResult } from "../sync/offlineOutletSyncTypes";
import { outletListRowToSubmitted } from "../utils/outletApiMap";

const RECENT_ACTIVITY_COUNT = 3;

function activityStatusLabel(item: SubmittedOutlet): string {
  if (item.syncStatus === "pending") {
    return "Waiting to sync";
  }
  switch (item.serverReviewStatus) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
      return "Under review";
    default:
      return "Submitted";
  }
}

function formatRecentSubmitted(iso: string): string {
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

function sortSubmissionsNewestFirst(rows: SubmittedOutlet[]): SubmittedOutlet[] {
  return [...rows].sort((a, b) => {
    const ta = new Date(a.submittedAt).getTime();
    const tb = new Date(b.submittedAt).getTime();
    const va = Number.isNaN(ta) ? 0 : ta;
    const vb = Number.isNaN(tb) ? 0 : tb;
    return vb - va;
  });
}

type QuickAction = {
  title: string;
  description: string;
  color: string;
  iconBg: string;
  iconColor: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/** Placeholder actions removed from UI; kept filtered so older edits/cache cannot surface them. */
const QUICK_ACTIONS_HIDDEN_TITLES = new Set(["Map View", "Reports"]);

const quickActions: QuickAction[] = [
  { title: "New Outlet", description: "Start collecting new outlet information", color: "#E8F7EE", iconBg: "#0ABF3A", iconColor: "#FFFFFF", icon: "add" },
  { title: "My Submissions", description: "View submitted outlets", color: "#F7ECFF", iconBg: "#8E35DE", iconColor: "#FFFFFF", icon: "arrow-up-outline" },
  { title: "My Drafts", description: "Continue incomplete submissions", color: "#EAF0FF", iconBg: "#2D8CFF", iconColor: "#FFFFFF", icon: "folder-open-outline" },
  { title: "Sync Data", description: "Upload offline data to server", color: "#FFF4DE", iconBg: "#E4A70A", iconColor: "#FFFFFF", icon: "sync-outline" },
];

const visibleQuickActions = quickActions.filter((item) => !QUICK_ACTIONS_HIDDEN_TITLES.has(item.title));

function summarizeManualSyncAlert(result: Extract<OfflineOutletSyncRunResult, { outcome: "complete" }>): void {
  const { syncedCount, stoppedForNetwork, pendingCountBefore } = result;
  if (pendingCountBefore === 0) {
    Alert.alert("Up to date", "All offline submissions are already synced with the server.");
    return;
  }
  if (syncedCount > 0 && !stoppedForNetwork) {
    Alert.alert(
      "Sync complete",
      `${syncedCount} offline submission${syncedCount === 1 ? "" : "s"} uploaded successfully.`,
    );
    return;
  }
  if (syncedCount > 0 && stoppedForNetwork) {
    Alert.alert(
      "Partial sync",
      `Uploaded ${syncedCount} submission${syncedCount === 1 ? "" : "s"}, but the connection dropped before finishing the rest. Try again when you have a stable signal.`,
    );
    return;
  }
  if (stoppedForNetwork) {
    Alert.alert("Couldn't sync", "Check your internet connection and try again.");
    return;
  }
  // Permanent failures already surfaced via alerts during upload.
}

export function DashboardScreen({
  token,
  user,
  onLogout,
  onOpenNewOutlet,
  onOpenMySubmissions,
  onOpenMyDrafts,
  onOpenProjects,
  onManualSyncOfflineQueue,
}: {
  token: string | null;
  user: AuthUser | null;
  onLogout: () => void;
  onOpenNewOutlet: () => void;
  onOpenMySubmissions: () => void;
  onOpenMyDrafts: () => void;
  onOpenProjects: () => void;
  onManualSyncOfflineQueue: () => Promise<OfflineOutletSyncRunResult>;
}) {
  const insets = useSafeAreaInsets();
  const { submittedOutlets } = useNewOutletDraft();
  const [assignments, setAssignments] = useState<MyWardAssignmentProject[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [overviewStats, setOverviewStats] = useState<DashboardStatsResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [recentRemoteSubmissions, setRecentRemoteSubmissions] = useState<SubmittedOutlet[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [manualSyncLoading, setManualSyncLoading] = useState(false);

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
    if (!token) {
      setOverviewStats(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setOverviewLoading(true);
      try {
        const stats = await apiDashboardStats(token);
        if (!cancelled) {
          setOverviewStats(stats);
        }
      } catch {
        if (!cancelled) {
          setOverviewStats(null);
        }
      } finally {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      setRecentRemoteSubmissions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      setRecentLoading(true);
      try {
        const rows = await apiListMyOutlets(token);
        if (cancelled) {
          return;
        }
        const mapped = rows.map((r) => outletListRowToSubmitted(r, user.name ?? "You"));
        setRecentRemoteSubmissions(sortSubmissionsNewestFirst(mapped));
      } catch {
        if (!cancelled) {
          setRecentRemoteSubmissions([]);
        }
      } finally {
        if (!cancelled) {
          setRecentLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user?.id, user?.name]);

  const addOutletEnabled = useMemo(
    () => computeAddOutletEnabled(user, assignments, assignmentsLoaded),
    [user, assignments, assignmentsLoaded],
  );

  const requestNewOutlet = () => {
    if (!addOutletEnabled) {
      Alert.alert("Cannot add outlet", FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE);
      return;
    }
    onOpenNewOutlet();
  };

  const handleManualSyncPress = () => {
    if (!token || !user) {
      Alert.alert("Sign in required", "Log in to sync offline data.");
      return;
    }
    setManualSyncLoading(true);
    void (async () => {
      try {
        const result = await onManualSyncOfflineQueue();
        if (result.outcome === "no_session") {
          Alert.alert("Sign in required", "Log in to sync offline data.");
          return;
        }
        if (result.outcome === "offline") {
          Alert.alert(
            "No connection",
            "Connect to the internet to upload submissions that are waiting to sync.",
          );
          return;
        }
        if (result.outcome === "busy") {
          Alert.alert("Sync in progress", "Another sync is running. Wait a moment and try again.");
          return;
        }
        summarizeManualSyncAlert(result);
      } finally {
        setManualSyncLoading(false);
      }
    })();
  };

  const pendingOfflineSubmissions = useMemo(
    () => submittedOutlets.filter((s) => s.syncStatus === "pending").length,
    [submittedOutlets],
  );

  const recentActivityItems = useMemo(() => {
    const pendingOnly = submittedOutlets.filter((s) => s.syncStatus === "pending");
    const merged = sortSubmissionsNewestFirst([...pendingOnly, ...recentRemoteSubmissions]);
    return merged.slice(0, RECENT_ACTIVITY_COUNT);
  }, [submittedOutlets, recentRemoteSubmissions]);

  const statusCounts = overviewStats?.outletsByStatus ?? {};

  const pickStatusCount = (slug: string): number | undefined => {
    const direct = statusCounts[slug];
    if (typeof direct === "number") {
      return direct;
    }
    const titled = statusCounts[slug.charAt(0).toUpperCase() + slug.slice(1)];
    return typeof titled === "number" ? titled : undefined;
  };

  const collectedOutletsLabel = (): string => {
    if (overviewLoading) {
      return "…";
    }
    if (overviewStats !== null) {
      return String(overviewStats.totalOutlets);
    }
    return "—";
  };

  const serverScopedStat = (statusSlug: string): string => {
    if (overviewLoading) {
      return "…";
    }
    if (overviewStats === null) {
      return "—";
    }
    const n = pickStatusCount(statusSlug);
    return typeof n === "number" ? String(n) : "0";
  };

  const primaryProject = assignments[0];
  const avatarUri =
    user?.avatar_url != null && user.avatar_url.length > 0
      ? user.avatar_url
      : user?.name != null && user.name.length > 0
        ? `https://ui-avatars.com/api/?size=128&background=ffffff&color=178E47&name=${encodeURIComponent(user.name)}`
        : undefined;

  return (
    <View style={styles.dashboardRoot}>
      <Modal visible={manualSyncLoading} transparent animationType="fade">
        <View style={styles.syncModalBackdrop}>
          <View style={styles.syncModalCard}>
            <ActivityIndicator size="large" color="#178E47" />
            <Text style={styles.syncModalTitle}>Syncing…</Text>
            <Text style={styles.syncModalSubtitle}>Uploading offline submissions to the server</Text>
          </View>
        </View>
      </Modal>

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTopRow}>
          <Pressable style={styles.headerIconBtn} onPress={onLogout}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.notificationWrap}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </View>
        </View>

        <View style={styles.profileRow}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
          <View>
            <Text style={styles.greeting}>Hello, {user?.name ?? "there"}</Text>
            <Text style={styles.role}>{user?.role?.name ?? "User"}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.projectCard} onPress={onOpenProjects}>
          <View style={styles.projectIconWrap}>
            <Feather name="briefcase" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.projectTextWrap}>
            <Text style={styles.projectLabel}>Your assignments · tap for all projects</Text>
            {!assignmentsLoaded ? (
              <Text style={styles.projectTitle}>Loading…</Text>
            ) : primaryProject ? (
              <>
                <Text style={styles.projectTitle}>{primaryProject.name}</Text>
                <Text style={styles.projectCounty}>{primaryProject.county} · status {primaryProject.status}</Text>
                {primaryProject.wards.length > 0 ? (
                  <Text style={styles.wardLine} numberOfLines={3}>
                    Wards: {primaryProject.wards.map((w) => w.name).join(", ")}
                  </Text>
                ) : (
                  <Text style={styles.projectCounty}>No wards assigned yet.</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.projectTitle}>No projects assigned yet</Text>
                <Text style={styles.projectCounty}>
                  Tap to open Projects or ask your admin to assign you under Projects.
                </Text>
              </>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#334155" />
        </Pressable>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.viewAllText}>
            {user?.role?.slug === "field_collector" ? "Your totals" : "Workspace totals"}
          </Text>
        </View>
        <Text style={styles.overviewHint}>
          {user?.role?.slug === "field_collector"
            ? "Server counts include only outlets you submitted; drafts are outlets saved on this phone waiting to upload."
            : "Counts reflect outlets for your organization."}
        </Text>
        <View style={styles.overviewRow}>
          <StatCard
            value={collectedOutletsLabel()}
            label="Collected Outlets"
            icon={<MaterialCommunityIcons name="storefront-outline" size={17} color="#169447" />}
            iconBg="#E7F6EC"
          />
          <StatCard
            value={String(pendingOfflineSubmissions)}
            label="Draft Outlets"
            icon={<Feather name="file-text" size={16} color="#E4A70A" />}
            iconBg="#FFF4DE"
          />
          <StatCard
            value={serverScopedStat("pending")}
            label="Submitted Outlets"
            icon={<Ionicons name="paper-plane-outline" size={16} color="#2D8CFF" />}
            iconBg="#EAF0FF"
          />
          <StatCard
            value={serverScopedStat("approved")}
            label="Approved Outlets"
            icon={<Ionicons name="checkmark-circle-outline" size={17} color="#8E35DE" />}
            iconBg="#F4EAFF"
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          {visibleQuickActions.map((item) => (
            <Pressable
              key={item.title}
              style={[
                styles.actionCard,
                { backgroundColor: item.color },
                item.title === "New Outlet" && !addOutletEnabled ? styles.actionCardDisabled : null,
              ]}
              onPress={
                item.title === "New Outlet"
                  ? requestNewOutlet
                  : item.title === "My Submissions"
                    ? onOpenMySubmissions
                    : item.title === "My Drafts"
                      ? onOpenMyDrafts
                      : item.title === "Sync Data"
                        ? handleManualSyncPress
                        : undefined
              }
            >
              <View style={[styles.actionIconWrap, { backgroundColor: item.iconBg }]}>
                <Ionicons name={item.icon} size={17} color={item.iconColor} />
              </View>
              <Text style={styles.actionTitle}>{item.title}</Text>
              <Text style={styles.actionDescription}>{item.description}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Pressable onPress={onOpenMySubmissions} hitSlop={10} accessibilityRole="button" accessibilityLabel="View all submissions">
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        </View>
        <View style={styles.activityList}>
          {recentLoading && recentActivityItems.length === 0 ? (
            <View style={styles.activityLoading}>
              <ActivityIndicator size="small" color="#169447" />
              <Text style={styles.activityLoadingText}>Loading recent submissions…</Text>
            </View>
          ) : recentActivityItems.length === 0 ? (
            <View style={styles.activityCard}>
              <Text style={styles.activityTitle}>No submissions yet</Text>
              <Text style={styles.activityMeta}>Capture an outlet or open My Submissions to see history.</Text>
            </View>
          ) : (
            recentActivityItems.map((item) => (
              <View key={item.id} style={styles.activityCard}>
                <Text style={styles.activityTitle}>{(item.facilityName ?? "").trim() || "Unnamed facility"}</Text>
                <Text style={styles.activityMeta}>{(item.physicalLocation ?? "").trim() || "No location"}</Text>
                <Text style={styles.activityMeta}>
                  {activityStatusLabel(item)} · {formatRecentSubmitted(item.submittedAt)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <FieldWorkerBottomNav
        active="home"
        addOutletEnabled={addOutletEnabled}
        addOutletBlockedMessage={FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE}
      />
    </View>
  );
}

function StatCard({
  value,
  label,
  icon,
  iconBg,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardRoot: { flex: 1, backgroundColor: "#F4F7F6" },
  syncModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  syncModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 12,
    maxWidth: 320,
    width: "100%",
  },
  syncModalTitle: { fontSize: 18, fontFamily: font.extraBold, color: "#0F172A" },
  syncModalSubtitle: {
    fontSize: 14,
    fontFamily: font.regular,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  header: {
    backgroundColor: "#178E47",
    paddingHorizontal: 25,
    paddingBottom: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerIconBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  notificationWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  notificationBadge: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#EA4335",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 9, fontFamily: font.bold },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: "#FFFFFFAA" },
  greeting: { color: "#FFFFFF", fontSize: 31, fontFamily: font.extraBold },
  role: { color: "#DAF5E2", marginTop: 2, fontSize: 13, fontFamily: font.regular },
  dashboardScroll: { padding: 16, gap: 12, paddingBottom: 110 },
  projectCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  projectIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 7,
    backgroundColor: "#169447",
    alignItems: "center",
    justifyContent: "center",
  },
  projectTextWrap: { flex: 1 },
  projectLabel: { fontSize: 12, color: "#64748B", marginBottom: 2, fontFamily: font.regular },
  projectTitle: { fontSize: 16, fontFamily: font.bold, color: "#1E293B" },
  projectCounty: { fontSize: 13, fontFamily: font.regular, color: "#64748B", marginTop: 4 },
  wardLine: { fontSize: 12, fontFamily: font.regular, color: "#475569", marginTop: 6 },
  avatarPlaceholder: { backgroundColor: "#DAF5E2" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  sectionTitle: { fontSize: 20, fontFamily: font.extraBold, color: "#0F172A" },
  viewAllText: { color: "#1D8E49", fontFamily: font.bold },
  overviewHint: {
    fontSize: 12,
    fontFamily: font.regular,
    color: "#64748B",
    lineHeight: 17,
    marginTop: -4,
    marginBottom: 4,
  },
  overviewRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 },
  statIconWrap: {
    alignSelf: "center",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: { textAlign: "center", fontSize: 23, fontFamily: font.extraBold, color: "#0F172A" },
  statLabel: { textAlign: "center", color: "#475569", fontSize: 12, marginTop: 4, fontFamily: font.regular },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: { width: "48%", borderRadius: 14, padding: 12, minHeight: 96 },
  actionCardDisabled: { opacity: 0.55 },
  actionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionTitle: { fontSize: 15, fontFamily: font.extraBold, color: "#1F2937" },
  actionDescription: { fontSize: 12, color: "#334155", marginTop: 5, lineHeight: 17, fontFamily: font.regular },
  activityList: { gap: 10 },
  activityCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 14 },
  activityLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  activityLoadingText: { fontFamily: font.regular, fontSize: 14, color: "#64748B" },
  activityTitle: { fontSize: 16, fontFamily: font.bold, color: "#0F172A", marginBottom: 5 },
  activityMeta: { color: "#475569", marginBottom: 2, fontFamily: font.regular },
});

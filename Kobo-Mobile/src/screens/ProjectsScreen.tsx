import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiMobileBootstrap, type AuthUser, type MyWardAssignmentProject } from "../api/client";
import { FieldWorkerBottomNav, type FieldWorkerNavTab } from "../components/FieldWorkerBottomNav";
import { font } from "../theme/fonts";
import {
  computeAddOutletEnabled,
  FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE,
  sortAssignmentsForDisplay,
  statusLabel,
} from "../utils/fieldWorkerProjects";

export function ProjectsScreen({
  token,
  user,
  onBack,
  navActive,
}: {
  token: string | null;
  user: AuthUser | null;
  onBack: () => void;
  navActive: FieldWorkerNavTab;
}) {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<MyWardAssignmentProject[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setProjects([]);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await apiMobileBootstrap(token);
        if (!cancelled) setProjects(sortAssignmentsForDisplay(rows.active_projects));
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const sorted = projects;
  const addOutletEnabled = computeAddOutletEnabled(user, projects, loaded);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerTitle}>Projects</Text>
          <Text style={styles.headerSubtitle}>
            {user?.role?.slug === "field_collector"
              ? "Your assigned census projects"
              : "Assignments for field collectors"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {!loaded ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#169447" />
            <Text style={styles.loadingText}>Loading projects…</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="folder-open-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No projects assigned</Text>
            <Text style={styles.emptyMeta}>
              {user?.role?.slug === "field_collector"
                ? "Ask your admin to assign you to an active project."
                : "Sign in as a field collector to see project assignments."}
            </Text>
          </View>
        ) : (
          sorted.map((p) => {
            const canCollectHere = p.status === "active" || p.status === "paused";
            const expanded = expandedProjectId === p.id;
            return (
              <View key={p.id} style={styles.card}>
                <Pressable
                  style={styles.cardHeader}
                  onPress={() => setExpandedProjectId(expanded ? null : p.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityHint="Shows or hides project details"
                >
                  <View style={styles.cardIconWrap}>
                    <MaterialCommunityIcons name="map-marker-radius" size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.projectName}>{p.name}</Text>
                    <Text style={styles.countyLine}>{p.branch ?? "No branch"}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusPill, !canCollectHere && styles.statusPillMuted]}>
                        <Text style={[styles.statusPillText, !canCollectHere && styles.statusPillTextMuted]}>
                          {statusLabel(p.status)}
                        </Text>
                      </View>
                      {!canCollectHere ? (
                        <Text style={styles.closedHint}>Outlet collection closed</Text>
                      ) : (
                        <Text style={styles.openHint}>
                          Ready for collection · tap to {expanded ? "hide" : "show"}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={22} color="#64748B" />
                </Pressable>
                {expanded ? (
                  <View style={styles.wardsSection}>
                    <Text style={styles.wardsHeading}>Project details</Text>
                    <Text style={styles.wardName}>Branch: {p.branch ?? "—"}</Text>
                    {p.questionnaire_name ? (
                      <Text style={styles.wardName}>Questionnaire: {p.questionnaire_name}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <FieldWorkerBottomNav
        active={navActive}
        addOutletEnabled={addOutletEnabled}
        addOutletBlockedMessage={FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE}
      />
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
  scroll: { padding: 16, gap: 12 },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: { fontFamily: font.regular, color: "#64748B" },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: { fontFamily: font.bold, fontSize: 18, color: "#0F172A" },
  emptyMeta: { fontFamily: font.regular, fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 21 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#169447",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderText: { flex: 1 },
  projectName: { fontSize: 16, fontFamily: font.bold, color: "#0F172A" },
  countyLine: { fontSize: 14, fontFamily: font.regular, color: "#64748B", marginTop: 4 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  statusPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillMuted: { backgroundColor: "#F1F5F9" },
  statusPillText: { fontSize: 12, fontFamily: font.semiBold, color: "#166534" },
  statusPillTextMuted: { color: "#475569" },
  openHint: { fontSize: 12, fontFamily: font.regular, color: "#475569" },
  closedHint: { fontSize: 12, fontFamily: font.semiBold, color: "#B45309" },
  wardsSection: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    gap: 8,
  },
  wardsHeading: { fontSize: 13, fontFamily: font.bold, color: "#334155", marginBottom: 4 },
  noWards: { fontSize: 13, fontFamily: font.regular, color: "#64748B" },
  wardRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  wardBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#169447",
  },
  wardName: { fontSize: 15, fontFamily: font.regular, color: "#1E293B", flex: 1 },
});

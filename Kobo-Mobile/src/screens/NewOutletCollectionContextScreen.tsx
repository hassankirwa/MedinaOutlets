import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiMyWardAssignments, type MyWardAssignmentProject } from "../api/client";
import { NewOutletSelectField } from "../components/NewOutletFields";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";
import { sortAssignmentsForDisplay, statusLabel } from "../utils/fieldWorkerProjects";

function projectCollectable(p: MyWardAssignmentProject): boolean {
  return (p.status === "active" || p.status === "paused") && p.wards.length > 0;
}

function projectUnavailableReason(p: MyWardAssignmentProject): string | null {
  if (projectCollectable(p)) {
    return null;
  }
  if (p.status !== "active" && p.status !== "paused") {
    return `Outlet collection is only open for active or paused projects (this one is ${statusLabel(p.status)}).`;
  }
  if (p.wards.length === 0) {
    return "No wards are assigned to you on this project yet.";
  }
  return "Not available for new outlets.";
}

export function NewOutletCollectionContextScreen({
  token,
  onBack,
  onNext,
}: {
  token: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useNewOutletDraft();
  const [loaded, setLoaded] = useState(false);
  const [projects, setProjects] = useState<MyWardAssignmentProject[]>([]);
  const [openPicker, setOpenPicker] = useState<"project" | "ward" | null>(null);

  useEffect(() => {
    if (!token) {
      setProjects([]);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await apiMyWardAssignments(token);
        if (!cancelled) setProjects(sortAssignmentsForDisplay(rows));
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

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === draft.collectionProjectId) ?? null,
    [projects, draft.collectionProjectId],
  );

  const wardChoices = selectedProject?.wards ?? [];

  const projectLabel =
    draft.collectionProjectId && draft.collectionProjectName
      ? `${draft.collectionProjectName}${selectedProject?.county ? ` · ${selectedProject.county}` : ""}`.trim()
      : "Select project";

  const wardLabel = draft.wardId != null && draft.wardName ? draft.wardName : "Select ward";

  const selectedProjectCollectable = selectedProject ? projectCollectable(selectedProject) : false;
  const canContinue = Boolean(
    selectedProjectCollectable && draft.collectionProjectId && draft.wardId != null,
  );

  const chooseProject = (p: MyWardAssignmentProject) => {
    if (!projectCollectable(p)) {
      return;
    }
    const wardStillValid = p.wards.some((w) => w.id === draft.wardId);
    updateDraft({
      collectionProjectId: p.id,
      collectionProjectName: p.name,
      ...(wardStillValid
        ? {}
        : {
            wardId: null,
            wardName: "",
          }),
    });
    setOpenPicker(null);
  };

  const chooseWard = (id: number, name: string) => {
    updateDraft({ wardId: id, wardName: name });
    setOpenPicker(null);
  };

  return (
    <View style={styles.root}>
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}>
        <Text style={styles.title}>Project & ward</Text>
        <Text style={styles.subtitle}>Choose where this outlet belongs before you start the survey steps.</Text>

        {!loaded ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0F9445" />
            <Text style={styles.loadingText}>Loading your assignments…</Text>
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No projects assigned</Text>
            <Text style={styles.emptyMeta}>
              You have no county projects linked to your account yet. Ask your admin to assign you to projects and
              wards.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.assignedHint}>
              County projects below are the ones assigned to you as a field collector (same list as in Projects).
            </Text>
            <NewOutletSelectField
              label="County project"
              value={projectLabel}
              onPress={() => setOpenPicker("project")}
              required
            />
            {draft.collectionProjectId && selectedProject && !selectedProjectCollectable ? (
              <Text style={styles.warningInline}>{projectUnavailableReason(selectedProject)}</Text>
            ) : null}
            <NewOutletSelectField
              label="Ward"
              value={wardLabel}
              onPress={() => {
                if (!draft.collectionProjectId || !selectedProjectCollectable) return;
                setOpenPicker("ward");
              }}
              required
            />
          </>
        )}
      </ScrollView>

      <NewOutletFooterButtons onNext={onNext} nextDisabled={!canContinue} showBack={false} />

      <Modal visible={openPicker === "project"} transparent animationType="fade" onRequestClose={() => setOpenPicker(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpenPicker(null)}>
          <Pressable style={styles.modal}>
            <Text style={styles.modalTitle}>Your assigned projects</Text>
            <Text style={styles.modalSubtitle}>Only active or paused projects with wards assigned to you can be used.</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {projects.map((p) => {
                const ok = projectCollectable(p);
                const reason = projectUnavailableReason(p);
                const selected = draft.collectionProjectId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.optionRow,
                      selected && styles.optionRowSelected,
                      !ok && styles.optionRowDisabled,
                    ]}
                    onPress={() => chooseProject(p)}
                    disabled={!ok}
                  >
                    <Text style={[styles.optionTitle, !ok && styles.optionTitleMuted]}>{p.name}</Text>
                    <Text style={styles.optionMeta}>{p.county}</Text>
                    <Text style={[styles.optionStatus, !ok && styles.optionStatusMuted]}>
                      {ok
                        ? `${statusLabel(p.status)} · ${p.wards.length} ward${p.wards.length === 1 ? "" : "s"}`
                        : reason ?? "Unavailable"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={openPicker === "ward"} transparent animationType="fade" onRequestClose={() => setOpenPicker(null)}>
        <Pressable style={styles.backdrop} onPress={() => setOpenPicker(null)}>
          <Pressable style={styles.modal}>
            <Text style={styles.modalTitle}>Select ward</Text>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {wardChoices.map((w) => (
                <Pressable
                  key={w.id}
                  style={[styles.optionRow, draft.wardId === w.id && styles.optionRowSelected]}
                  onPress={() => chooseWard(w.id, w.name)}
                >
                  <Text style={styles.optionTitle}>{w.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },
  scroll: { paddingHorizontal: 16, paddingTop: 18, gap: 14 },
  title: { color: "#1E293B", fontSize: 31, fontFamily: font.extraBold },
  subtitle: { color: "#475569", fontSize: 17, marginBottom: 8, fontFamily: font.regular, lineHeight: 24 },
  assignedHint: {
    fontFamily: font.regular,
    fontSize: 14,
    color: "#475569",
    lineHeight: 21,
    marginBottom: 4,
  },
  warningInline: {
    fontFamily: font.regular,
    fontSize: 13,
    color: "#B45309",
    lineHeight: 19,
    marginTop: -6,
  },
  loadingBox: { alignItems: "center", paddingVertical: 36, gap: 12 },
  loadingText: { fontFamily: font.regular, color: "#64748B", fontSize: 15 },
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: "#0F172A" },
  emptyMeta: { fontFamily: font.regular, fontSize: 14, color: "#64748B", lineHeight: 21 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modal: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingVertical: 14,
    maxHeight: "72%",
  },
  modalTitle: {
    fontFamily: font.bold,
    fontSize: 17,
    color: "#0F172A",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  modalSubtitle: {
    fontFamily: font.regular,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  modalList: { maxHeight: 360 },
  optionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
  },
  optionRowSelected: { backgroundColor: "#ECFDF5" },
  optionRowDisabled: { opacity: 0.72 },
  optionTitle: { fontFamily: font.semiBold, fontSize: 16, color: "#1E293B" },
  optionTitleMuted: { color: "#64748B" },
  optionMeta: { fontFamily: font.regular, fontSize: 13, color: "#64748B", marginTop: 4 },
  optionStatus: { fontFamily: font.regular, fontSize: 12, color: "#169447", marginTop: 6 },
  optionStatusMuted: { color: "#94A3B8" },
});

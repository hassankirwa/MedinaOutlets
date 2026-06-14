import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiMobileBootstrap, type MyWardAssignmentProject } from "../api/client";
import { NewOutletSelectField } from "../components/NewOutletFields";
import { NewOutletFormScreen } from "../components/NewOutletFormScreen";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";
import { sortAssignmentsForDisplay, statusLabel } from "../utils/fieldWorkerProjects";

function projectCollectable(p: MyWardAssignmentProject): boolean {
  return p.status === "active" || p.status === "paused";
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
  const [openPicker, setOpenPicker] = useState(false);

  useEffect(() => {
    if (!token) {
      setProjects([]);
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const boot = await apiMobileBootstrap(token);
        if (!cancelled) {
          setProjects(sortAssignmentsForDisplay(boot.active_projects));
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
        }
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

  const projectLabel = draft.collectionProjectName || "Select project";

  const canContinue = Boolean(draft.collectionProjectId && selectedProject && projectCollectable(selectedProject));

  const chooseProject = (p: MyWardAssignmentProject) => {
    if (!projectCollectable(p)) return;
    updateDraft({
      collectionProjectId: p.id,
      collectionProjectName: p.name,
      branchId: p.branch_id ? Number(p.branch_id) : null,
      branchName: p.branch ?? "",
      questionnaireId: p.questionnaire_id ? Number(p.questionnaire_id) : null,
      countyId: null,
      countyName: "",
      wardId: null,
      wardName: "",
    });
    setOpenPicker(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <NewOutletFormScreen contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Select project</Text>
        <Text style={styles.subtitle}>Choose the census project you are collecting outlets for. Branch is set automatically from the project.</Text>

        {!loaded ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0F9445" />
            <Text style={styles.loadingText}>Loading projects…</Text>
          </View>
        ) : (
          <>
            <NewOutletSelectField label="Project" value={projectLabel} onPress={() => setOpenPicker(true)} required />
            {selectedProject ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Selected Project</Text>
                <Text style={styles.infoValue}>{draft.collectionProjectName || "—"}</Text>
                <Text style={styles.infoLabel}>Branch</Text>
                <Text style={styles.infoValue}>{draft.branchName || "—"}</Text>
              </View>
            ) : null}
          </>
        )}
      </NewOutletFormScreen>

      <NewOutletFooterButtons onNext={onNext} nextDisabled={!canContinue} showBack={false} />

      <PickerModal open={openPicker} title="Select project" onClose={() => setOpenPicker(false)}>
        {projects.map((p) => (
          <Pressable key={p.id} style={styles.optionRow} onPress={() => chooseProject(p)}>
            <Text style={styles.optionTitle}>{p.name}</Text>
            <Text style={styles.optionMeta}>{p.branch ?? "No branch"} · {statusLabel(p.status)}</Text>
          </Pressable>
        ))}
      </PickerModal>
    </KeyboardAvoidingView>
  );
}

function PickerModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modal}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalList}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB", overflow: "hidden" },
  scroll: { paddingHorizontal: 16, paddingTop: 18, gap: 14 },
  title: { color: "#1E293B", fontSize: 31, fontFamily: font.extraBold },
  subtitle: { color: "#475569", fontSize: 17, marginBottom: 8, fontFamily: font.regular, lineHeight: 24 },
  loadingBox: { alignItems: "center", paddingVertical: 36, gap: 12 },
  loadingText: { fontFamily: font.regular, color: "#64748B", fontSize: 15 },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 4,
  },
  infoLabel: { fontFamily: font.semiBold, fontSize: 13, color: "#64748B" },
  infoValue: { fontFamily: font.semiBold, fontSize: 16, color: "#1E293B" },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", paddingHorizontal: 20 },
  modal: { backgroundColor: "#FFF", borderRadius: 14, paddingVertical: 14, maxHeight: "72%" },
  modalTitle: { fontFamily: font.bold, fontSize: 17, color: "#0F172A", paddingHorizontal: 16, paddingBottom: 10 },
  modalList: { maxHeight: 360 },
  optionRow: { paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E2E8F0" },
  optionTitle: { fontFamily: font.semiBold, fontSize: 16, color: "#1E293B" },
  optionMeta: { fontFamily: font.regular, fontSize: 13, color: "#64748B", marginTop: 4 },
});

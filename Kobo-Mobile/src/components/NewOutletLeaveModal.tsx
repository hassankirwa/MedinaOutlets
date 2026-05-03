import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { font } from "../theme/fonts";

export function NewOutletLeaveModal({
  visible,
  onCancel,
  onSaveDraft,
  onDiscard,
  saving,
}: {
  visible: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Outer Pressable wrapping the card steals taps on some Android builds; dim layer + View card fixes Save / Discard. */}
      <View style={styles.wrap}>
        <Pressable style={styles.dim} onPress={onCancel} accessibilityLabel="Close dialog" />
        <View style={styles.card}>
          <Text style={styles.title}>Save your progress?</Text>
          <Text style={styles.body}>
            You have not finished this outlet. Save it as a draft to continue later from My Drafts, or discard your
            changes.
          </Text>
          <Pressable
            style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
            onPress={(e) => {
              e?.stopPropagation?.();
              onSaveDraft();
            }}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>Save to drafts</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.dangerBtn}
            onPress={(e) => {
              e?.stopPropagation?.();
              onDiscard();
            }}
            disabled={saving}
          >
            <Text style={styles.dangerBtnText}>Discard</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
            <Text style={styles.cancelBtnText}>Keep editing</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 22,
    gap: 14,
    zIndex: 1,
    elevation: 8,
  },
  title: { fontFamily: font.extraBold, fontSize: 20, color: "#0F172A", textAlign: "center" },
  body: {
    fontFamily: font.regular,
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
    textAlign: "center",
  },
  primaryBtn: {
    backgroundColor: "#0F9445",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" },
  dangerBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  dangerBtnText: { fontFamily: font.semiBold, fontSize: 16, color: "#BE123C" },
  cancelBtn: { paddingVertical: 8, alignItems: "center" },
  cancelBtnText: { fontFamily: font.semiBold, fontSize: 16, color: "#64748B" },
});

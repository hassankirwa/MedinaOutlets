import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { NewOutletStepBar } from "../components/NewOutletStepBar";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";

export function NewOutletSubmitSuccessScreen({
  onAddAnotherOutlet,
  onViewAllOutlets,
}: {
  onAddAnotherOutlet: () => void;
  onViewAllOutlets: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { submittedOutlets } = useNewOutletDraft();
  const latest = submittedOutlets[0];
  const latestName = latest?.facilityName?.trim() || "The outlet";
  const isOfflineQueued = latest?.syncStatus === "pending";

  return (
    <View style={styles.root}>
      <NewOutletHeader topInset={insets.top} onBack={onViewAllOutlets} />
      <NewOutletStepBar step={6} total={6} />

      <View style={styles.content}>
        <View style={[styles.iconWrap, isOfflineQueued && styles.iconWrapOffline]}>
          <Ionicons
            name={isOfflineQueued ? "cloud-upload-outline" : "checkmark-circle-outline"}
            size={88}
            color={isOfflineQueued ? "#B45309" : "#0F9445"}
          />
        </View>

        <Text style={styles.title}>
          {isOfflineQueued ? "Saved on device" : "Outlet Added\nSuccessfully!"}
        </Text>
        <Text style={styles.subtitle}>
          {isOfflineQueued
            ? `${latestName} is queued without signal. It will upload automatically when you’re back online. You can see it under My Submissions as “Waiting to sync”.`
            : `${latestName} has been successfully added to your outlet list.`}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.primaryButton} onPress={onAddAnotherOutlet}>
          <Text style={styles.primaryText}>Add Another Outlet</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onViewAllOutlets}>
          <Text style={styles.secondaryText}>View All Outlets</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },
  content: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  iconWrap: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: "#E6F5EB",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapOffline: { backgroundColor: "#FEF3C7" },
  title: { color: "#1E293B", fontSize: 30, lineHeight: 36, fontFamily: font.extraBold, textAlign: "center" },
  subtitle: { color: "#334155", fontSize: 18, lineHeight: 25, textAlign: "center", fontFamily: font.regular },
  actions: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  primaryButton: {
    height: 50,
    borderRadius: 8,
    backgroundColor: "#0F9445",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFF", fontSize: 16, fontFamily: font.bold },
  secondaryButton: {
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0F9445",
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: "#0F9445", fontSize: 16, fontFamily: font.bold },
});

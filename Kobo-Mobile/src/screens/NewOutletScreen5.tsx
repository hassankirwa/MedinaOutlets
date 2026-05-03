import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatOptionLabel } from "../components/NewOutletFields";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { NewOutletStepBar } from "../components/NewOutletStepBar";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";

type ReviewItem = {
  label: string;
  value: string;
  icon: ReactNode;
};

function emptyLabel(text: string): string {
  const t = text.trim();
  return t.length ? t : "—";
}

export function NewOutletScreen5({
  onBack,
  onSubmit,
  submitDisabled = false,
}: {
  onBack: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useNewOutletDraft();

  const reviewItems: ReviewItem[] = useMemo(() => {
    const categoryRow =
      draft.typeOfAccount === "SHOP"
        ? null
        : ({
            label: "Category",
            value: formatOptionLabel(draft.selectedCategory),
            icon: <Ionicons name="layers-outline" size={16} color="#16A34A" />,
          } satisfies ReviewItem);

    const placement: ReviewItem[] = [];
    if (draft.collectionProjectName.trim()) {
      placement.push({
        label: "Project",
        value: draft.collectionProjectName.trim(),
        icon: <MaterialCommunityIcons name="folder-outline" size={16} color="#169447" />,
      });
    }
    if (draft.wardName.trim()) {
      placement.push({
        label: "Ward",
        value: draft.wardName.trim(),
        icon: <Ionicons name="map-outline" size={16} color="#169447" />,
      });
    }

    const base: ReviewItem[] = [
      {
        label: "Type of Account",
        value: formatOptionLabel(draft.typeOfAccount),
        icon: <Ionicons name="person-outline" size={16} color="#16A34A" />,
      },
      {
        label: "Medical Facility Status",
        value: formatOptionLabel(draft.medicalFacilityStatus),
        icon: <MaterialCommunityIcons name="medical-bag" size={16} color="#16A34A" />,
      },
      {
        label: "Outlet Serviced By Medolab / Medina",
        value: formatOptionLabel(draft.outletServicedByMed),
        icon: <MaterialCommunityIcons name="hospital-building" size={16} color="#16A34A" />,
      },
    ];

    const afterCategory: ReviewItem[] = [
      {
        label: "Facility Name",
        value: emptyLabel(draft.facilityName),
        icon: <Ionicons name="document-text-outline" size={16} color="#F59E0B" />,
      },
      {
        label: "Owner / Director",
        value: emptyLabel(draft.ownerName),
        icon: <Ionicons name="people-outline" size={16} color="#F59E0B" />,
      },
      {
        label: "Business / Office Line",
        value: emptyLabel(draft.businessPhone),
        icon: <Ionicons name="call-outline" size={16} color="#64748B" />,
      },
      {
        label: "Email",
        value: emptyLabel(draft.email),
        icon: <Ionicons name="mail-outline" size={16} color="#64748B" />,
      },
      {
        label: "Physical Location",
        value: emptyLabel(draft.physicalLocation),
        icon: <Ionicons name="location-outline" size={16} color="#FB923C" />,
      },
      {
        label: "Landmark",
        value: emptyLabel(draft.landmark),
        icon: <Ionicons name="navigate-outline" size={16} color="#3B82F6" />,
      },
      {
        label: "GPS Location",
        value: emptyLabel(draft.gps),
        icon: <Ionicons name="pin-outline" size={16} color="#2563EB" />,
      },
      {
        label: "GPS Accuracy",
        value: `${draft.accuracyMeters} m`,
        icon: <Ionicons name="analytics-outline" size={16} color="#2563EB" />,
      },
      {
        label: "Photos",
        value:
          draft.photos.length === 0
            ? "None"
            : `${draft.photos.length} photo${draft.photos.length === 1 ? "" : "s"} captured`,
        icon: <Ionicons name="camera-outline" size={16} color="#64748B" />,
      },
      {
        label: "Remarks",
        value: emptyLabel(draft.remarks),
        icon: <Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748B" />,
      },
    ];

    const core = categoryRow ? [...base, categoryRow, ...afterCategory] : [...base, ...afterCategory];
    return [...placement, ...core];
  }, [draft]);

  return (
    <View style={styles.root}>
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <NewOutletStepBar step={5} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review & Submit</Text>
        <Text style={styles.subtitle}>Please review all information.</Text>

        <Text style={styles.remarksLabel}>Remarks (optional)</Text>
        <TextInput
          style={styles.remarksInput}
          value={draft.remarks}
          onChangeText={(t) => updateDraft({ remarks: t })}
          placeholder="Add any notes before submitting"
          placeholderTextColor="#94A3B8"
          multiline
        />

        <View style={styles.reviewList}>
          {reviewItems.map((item) => (
            <View key={item.label} style={styles.reviewRow}>
              <View style={styles.leftSection}>
                <View style={styles.iconWrap}>{item.icon}</View>
                <Text style={styles.rowLabel}>{item.label}</Text>
              </View>
              <Text style={styles.rowValue}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <NewOutletFooterButtons
        onBack={onBack}
        onNext={onSubmit}
        nextLabel="Submit"
        nextDisabled={submitDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB" },
  content: { padding: 20, paddingBottom: 100 },
  title: { color: "#1E293B", fontSize: 31, fontFamily: font.extraBold },
  subtitle: { color: "#475569", fontSize: 19, marginTop: 6, marginBottom: 12, fontFamily: font.regular },
  remarksLabel: { color: "#334155", fontSize: 15, fontFamily: font.semiBold, marginBottom: 8 },
  remarksInput: {
    borderWidth: 1,
    borderColor: "#D4DEE8",
    borderRadius: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    color: "#1F2937",
    fontSize: 15,
    fontFamily: font.regular,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  reviewList: { gap: 10 },
  reviewRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 10 },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { color: "#334155", fontSize: 16, fontFamily: font.semiBold, flexShrink: 1 },
  rowValue: { color: "#334155", fontSize: 16, fontFamily: font.bold, textAlign: "right", flexShrink: 1, maxWidth: "48%" },
});

import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NewOutletDropdownModal, NewOutletSelectField, formatOptionLabel } from "../components/NewOutletFields";
import { NewOutletFormScreen } from "../components/NewOutletFormScreen";
import { NewOutletFooterButtons } from "../components/NewOutletFooterButtons";
import { NewOutletHeader } from "../components/NewOutletHeader";
import { NewOutletStepBar } from "../components/NewOutletStepBar";
import { useNewOutletDraft } from "../context/NewOutletDraftContext";
import { font } from "../theme/fonts";

export function NewOutletScreen1({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const { draft, updateDraft } = useNewOutletDraft();
  const { typeOfAccount, medicalFacilityStatus, outletServicedByMed, selectedCategory } = draft;
  const [openDropdown, setOpenDropdown] = useState<"type" | "status" | "serviced" | "category" | null>(null);

  const categoryConfig: Record<string, { label: string; options: string[] }> = {
    PHARMACY: {
      label: "Pharmacy Categories",
      options: ["RETAIL PHARMACY", "AGRO_PHARMA", "WHOLESALE PHARMACY", "WHOLESALE_&_RETAIL_PHARMACY"],
    },
    AGROVET: { label: "Agrovet Categories", options: ["VETERINARY_AGROVET", "GENERAL_AGROVET", "AGRO_DEALER"] },
    HOSPITAL: { label: "Hospital Categories", options: ["PRIVATE_HOSPITAL", "PUBLIC_HOSPITAL", "FAITH_BASED_HOSPITAL"] },
    CLINIC_DISPENSARY: { label: "Clinic / Dispensary Categories", options: ["PRIVATE_DISPENSARY", "PUBLIC_DISPENSARY"] },
  };
  const activeCategory = categoryConfig[typeOfAccount];
  const isComplete = Boolean(
    typeOfAccount && medicalFacilityStatus && outletServicedByMed && (!activeCategory || selectedCategory),
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <NewOutletHeader topInset={insets.top} onBack={onBack} />
      <NewOutletStepBar step={1} />
      <NewOutletFormScreen contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Outlet Classification</Text>
        <Text style={styles.subtitle}>Tell us more about this outlet</Text>
        <NewOutletSelectField label="Type of Account" value={formatOptionLabel(typeOfAccount)} onPress={() => setOpenDropdown("type")} required />
        <NewOutletSelectField label="Medical Facility Status" value={formatOptionLabel(medicalFacilityStatus)} onPress={() => setOpenDropdown("status")} required />
        <NewOutletSelectField label={"Outlet Serviced By\nMedolab / Medina"} value={formatOptionLabel(outletServicedByMed)} onPress={() => setOpenDropdown("serviced")} required />
        {activeCategory ? <NewOutletSelectField label={activeCategory.label} value={formatOptionLabel(selectedCategory)} onPress={() => setOpenDropdown("category")} required /> : null}
      </NewOutletFormScreen>
      <NewOutletFooterButtons onNext={onNext} nextDisabled={!isComplete} showBack={false} />
      <NewOutletDropdownModal
        visible={openDropdown === "type"}
        title="Select Type of Account"
        options={["PHARMACY", "CLINIC_DISPENSARY", "AGROVET", "SHOP", "HOSPITAL"]}
        selected={typeOfAccount}
        onClose={() => setOpenDropdown(null)}
        onSelect={(v) => {
          updateDraft({
            typeOfAccount: v,
            selectedCategory: "",
          });
          setOpenDropdown(null);
        }}
      />
      <NewOutletDropdownModal
        visible={openDropdown === "status"}
        title="Select Medical Facility Status"
        options={["REGISTERED", "UNREGISTERED"]}
        selected={medicalFacilityStatus}
        onClose={() => setOpenDropdown(null)}
        onSelect={(v) => {
          updateDraft({ medicalFacilityStatus: v });
          setOpenDropdown(null);
        }}
      />
      <NewOutletDropdownModal
        visible={openDropdown === "serviced"}
        title="Outlet Serviced By Medolab / Medina"
        options={["YES", "NO"]}
        selected={outletServicedByMed}
        onClose={() => setOpenDropdown(null)}
        onSelect={(v) => {
          updateDraft({ outletServicedByMed: v });
          setOpenDropdown(null);
        }}
      />
      <NewOutletDropdownModal
        visible={openDropdown === "category"}
        title={activeCategory?.label ?? "Select Category"}
        options={activeCategory?.options ?? []}
        selected={selectedCategory}
        onClose={() => setOpenDropdown(null)}
        onSelect={(v) => {
          updateDraft({ selectedCategory: v });
          setOpenDropdown(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F7FB", overflow: "hidden" },
  scroll: { paddingHorizontal: 16, paddingTop: 18, gap: 14 },
  title: { color: "#1E293B", fontSize: 31, fontFamily: font.extraBold },
  subtitle: { color: "#475569", fontSize: 19, marginBottom: 6, fontFamily: font.regular },
});

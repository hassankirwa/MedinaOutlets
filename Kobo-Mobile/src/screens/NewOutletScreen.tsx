import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function NewOutletScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2>(1);
  const [typeOfAccount, setTypeOfAccount] = useState("PHARMACY");
  const [medicalFacilityStatus, setMedicalFacilityStatus] = useState("REGISTERED");
  const [outletServicedByMed, setOutletServicedByMed] = useState("YES");
  const [selectedCategory, setSelectedCategory] = useState("RETAIL PHARMACY");
  const [openDropdown, setOpenDropdown] = useState<"type" | "status" | "serviced" | "category" | null>(null);
  const [facilityName, setFacilityName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [email, setEmail] = useState("");

  const typeOfAccountOptions = ["PHARMACY", "CLINIC_DISPENSARY", "AGROVET", "SHOP", "HOSPITAL"];
  const medicalStatusOptions = ["REGISTERED", "UNREGISTERED"];
  const servicedByMedOptions = ["YES", "NO"];

  const categoryConfig: Record<string, { label: string; options: string[] }> = {
    PHARMACY: {
      label: "Pharmacy Categories",
      options: ["RETAIL PHARMACY", "AGRO_PHARMA", "WHOLESALE PHARMACY", "WHOLESALE_&_RETAIL_PHARMACY"],
    },
    AGROVET: {
      label: "Agrovet Categories",
      options: ["VETERINARY_AGROVET", "GENERAL_AGROVET", "AGRO_DEALER"],
    },
    HOSPITAL: {
      label: "Hospital Categories",
      options: ["PRIVATE_HOSPITAL", "PUBLIC_HOSPITAL", "FAITH_BASED_HOSPITAL"],
    },
    CLINIC_DISPENSARY: {
      label: "Clinic / Dispensary Categories",
      options: ["PRIVATE_DISPENSARY", "PUBLIC_DISPENSARY"],
    },
  };

  const activeCategory = categoryConfig[typeOfAccount];
  const isStepOneComplete =
    typeOfAccount.trim().length > 0 &&
    medicalFacilityStatus.trim().length > 0 &&
    outletServicedByMed.trim().length > 0 &&
    (!activeCategory || selectedCategory.trim().length > 0);

  return (
    <View style={styles.newOutletRoot}>
      <View style={[styles.newOutletHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} style={styles.newOutletBackBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.newOutletHeaderTitle}>New Outlet</Text>
      </View>

      <View style={styles.stepBar}>
        <Text style={step === 1 ? styles.stepTextActive : styles.stepTextMuted}>Step 1 of 6</Text>
        <View style={styles.stepProgressTrack}>
          <View style={[styles.stepProgressFill, { width: step === 1 ? "18%" : "40%" }]} />
        </View>
        <Text style={step === 2 ? styles.stepTextActive : styles.stepTextMuted}>Step 2 of 6</Text>
        <Text style={styles.stepTextMuted}>Step 3 of 6</Text>
      </View>

      <ScrollView contentContainerStyle={styles.newOutletScroll} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <>
            <Text style={styles.newOutletSectionTitle}>Outlet Classification</Text>
            <Text style={styles.newOutletSectionSubtitle}>Tell us more about this outlet</Text>

            <SelectField label="Type of Account" value={formatOptionLabel(typeOfAccount)} required onPress={() => setOpenDropdown("type")} />
            <SelectField
              label="Medical Facility Status"
              value={formatOptionLabel(medicalFacilityStatus)}
              required
              onPress={() => setOpenDropdown("status")}
            />
            <SelectField
              label={"Outlet Serviced By\nMedolab / Medina"}
              value={formatOptionLabel(outletServicedByMed)}
              required
              onPress={() => setOpenDropdown("serviced")}
            />
            {activeCategory ? (
              <SelectField
                label={activeCategory.label}
                value={formatOptionLabel(selectedCategory)}
                required
                onPress={() => setOpenDropdown("category")}
              />
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.newOutletSectionTitle}>Outlet Identity</Text>
            <Text style={styles.newOutletSectionSubtitle}>Enter identity information.</Text>

            <InputField label="Facility Name" value={facilityName} onChangeText={setFacilityName} required />
            <InputField label="Owner / Director Name" value={ownerName} onChangeText={setOwnerName} required />
            <InputField label="Business / Office Line" value={businessPhone} onChangeText={setBusinessPhone} keyboardType="phone-pad" />
            <InputField label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" />
          </>
        )}
      </ScrollView>

      <View style={styles.newOutletFooter}>
        {step === 1 ? (
          <Pressable
            style={[styles.nextButton, !isStepOneComplete && styles.nextButtonDisabled]}
            onPress={() => setStep(2)}
            disabled={!isStepOneComplete}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </Pressable>
        ) : (
          <View style={styles.stepTwoButtonRow}>
            <Pressable style={styles.backButton} onPress={() => setStep(1)}>
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
            <Pressable style={styles.nextButton}>
              <Text style={styles.nextButtonText}>Next</Text>
            </Pressable>
          </View>
        )}
      </View>

      <DropdownModal
        visible={openDropdown === "type"}
        title="Select Type of Account"
        options={typeOfAccountOptions}
        selectedValue={typeOfAccount}
        onClose={() => setOpenDropdown(null)}
        onSelect={(value) => {
          setTypeOfAccount(value);
          const nextCategory = categoryConfig[value];
          setSelectedCategory(nextCategory ? nextCategory.options[0] : "");
          setOpenDropdown(null);
        }}
      />
      <DropdownModal
        visible={openDropdown === "status"}
        title="Select Medical Facility Status"
        options={medicalStatusOptions}
        selectedValue={medicalFacilityStatus}
        onClose={() => setOpenDropdown(null)}
        onSelect={(value) => {
          setMedicalFacilityStatus(value);
          setOpenDropdown(null);
        }}
      />
      <DropdownModal
        visible={openDropdown === "serviced"}
        title="Outlet Serviced By Medolab / Medina"
        options={servicedByMedOptions}
        selectedValue={outletServicedByMed}
        onClose={() => setOpenDropdown(null)}
        onSelect={(value) => {
          setOutletServicedByMed(value);
          setOpenDropdown(null);
        }}
      />
      <DropdownModal
        visible={openDropdown === "category"}
        title={activeCategory?.label ?? "Select Category"}
        options={activeCategory?.options ?? []}
        selectedValue={selectedCategory}
        onClose={() => setOpenDropdown(null)}
        onSelect={(value) => {
          setSelectedCategory(value);
          setOpenDropdown(null);
        }}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  required = false,
  onPress,
}: {
  label: string;
  value: string;
  required?: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
      </Text>
      <Pressable style={styles.selectInput} onPress={onPress}>
        <Text style={styles.selectValue}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color="#475569" />
      </Pressable>
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  required = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
      </Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function DropdownModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
            {options.map((option) => (
              <Pressable key={option} style={styles.modalOption} onPress={() => onSelect(option)}>
                <Text style={styles.modalOptionText}>{formatOptionLabel(option)}</Text>
                {selectedValue === option ? <Ionicons name="checkmark" size={18} color="#0F9445" /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function formatOptionLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\s*&\s*/g, " & ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  newOutletRoot: { flex: 1, backgroundColor: "#F6F7FB" },
  newOutletHeader: {
    backgroundColor: "#0F9445",
    minHeight: 96,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  newOutletBackBtn: { position: "absolute", left: 16, bottom: 16, width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  newOutletHeaderTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginTop: 2 },
  stepBar: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepTextActive: { color: "#0F9445", fontSize: 12, fontWeight: "700" },
  stepTextMuted: { color: "#475569", fontSize: 12, fontWeight: "600" },
  stepProgressTrack: {
    flex: 1,
    marginHorizontal: 12,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  stepProgressFill: { width: "22%", height: "100%", backgroundColor: "#0F9445" },
  newOutletScroll: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 14,
  },
  newOutletSectionTitle: { color: "#1E293B", fontSize: 31, fontWeight: "800" },
  newOutletSectionSubtitle: { color: "#475569", fontSize: 19, marginBottom: 6 },
  fieldBlock: { marginTop: 10 },
  fieldLabel: { color: "#334155", fontSize: 18, fontWeight: "700", marginBottom: 10, lineHeight: 23 },
  requiredAsterisk: { color: "#EF4444" },
  selectInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D4DEE8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: { color: "#1F2937", fontSize: 16 },
  newOutletFooter: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
  },
  stepTwoButtonRow: { flexDirection: "row", gap: 10 },
  backButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  backButtonText: { color: "#334155", fontSize: 20, fontWeight: "600" },
  nextButton: {
    flex: 1,
    backgroundColor: "#0F9445",
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonDisabled: {
    backgroundColor: "#8ECFA8",
  },
  nextButtonText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  textInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D4DEE8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#1F2937",
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 10 },
  modalList: { maxHeight: 350 },
  modalOption: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalOptionText: { color: "#1E293B", fontSize: 15, flex: 1, paddingRight: 8 },
});

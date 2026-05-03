import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { font } from "../theme/fonts";

export function NewOutletInputField({
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
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
      />
    </View>
  );
}

export function NewOutletSelectField({
  label,
  value,
  onPress,
  required = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>
      <Pressable style={styles.select} onPress={onPress}>
        <Text style={styles.selectText}>{value}</Text>
        <Ionicons name="chevron-down" size={18} color="#475569" />
      </Pressable>
    </View>
  );
}

export function NewOutletDropdownModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modal}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {options.map((option) => (
              <Pressable key={option} style={styles.option} onPress={() => onSelect(option)}>
                <Text style={styles.optionText}>{formatOptionLabel(option)}</Text>
                {selected === option ? <Ionicons name="checkmark" size={18} color="#0F9445" /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function formatOptionLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\s*&\s*/g, " & ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  field: { marginTop: 10 },
  label: { color: "#334155", fontSize: 18, fontFamily: font.bold, marginBottom: 10, lineHeight: 23 },
  req: { color: "#EF4444" },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D4DEE8",
    borderRadius: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    color: "#1F2937",
    fontSize: 16,
    fontFamily: font.regular,
  },
  select: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D4DEE8",
    borderRadius: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: { color: "#1F2937", fontSize: 16, fontFamily: font.regular },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.35)", justifyContent: "center", paddingHorizontal: 20 },
  modal: { maxHeight: "72%", backgroundColor: "#FFF", borderRadius: 14, padding: 14 },
  modalTitle: { fontSize: 18, fontFamily: font.bold, color: "#1E293B", marginBottom: 10 },
  option: {
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
  optionText: { color: "#1E293B", fontSize: 15, flex: 1, paddingRight: 8, fontFamily: font.regular },
});

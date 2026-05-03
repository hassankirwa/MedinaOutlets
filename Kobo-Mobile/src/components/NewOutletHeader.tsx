import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { font } from "../theme/fonts";

export function NewOutletHeader({
  title = "New Outlet",
  topInset,
  onBack,
}: {
  title?: string;
  topInset: number;
  onBack: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: topInset + 8 }]}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#0F9445",
    minHeight: 110,
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    bottom: 16,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#FFF", fontSize: 24, fontFamily: font.bold },
});

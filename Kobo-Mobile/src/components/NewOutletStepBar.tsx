import { StyleSheet, Text, View } from "react-native";
import { font } from "../theme/fonts";

export function NewOutletStepBar({ step, total = 6 }: { step: number; total?: number }) {
  const progress = Math.max(0, Math.min(100, (step / total) * 100));

  return (
    <View style={styles.stepBar}>
      <Text style={styles.stepActive}>{`Step ${step} of ${total}`}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepBar: {
    backgroundColor: "#FFF",
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 58,
    gap: 8,
  },
  stepActive: { color: "#0F9445", fontSize: 12, fontFamily: font.bold },
  track: { flex: 1, height: 4, borderRadius: 999, backgroundColor: "#E2E8F0", overflow: "hidden" },
  fill: { height: "100%", backgroundColor: "#0F9445" },
});

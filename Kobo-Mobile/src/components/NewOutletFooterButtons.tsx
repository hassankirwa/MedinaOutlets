import { Pressable, StyleSheet, Text, View } from "react-native";
import { font } from "../theme/fonts";

export function NewOutletFooterButtons({
  onBack,
  onNext,
  nextDisabled = false,
  nextLabel = "Next",
  showBack = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  showBack?: boolean;
}) {
  if (!showBack) {
    return (
      <View style={styles.singleWrap}>
        <Pressable style={[styles.nextAction, nextDisabled && styles.nextDisabled]} onPress={onNext} disabled={nextDisabled}>
          <Text style={styles.nextActionText}>{nextLabel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.rowWrap}>
      <Pressable style={styles.backAction} onPress={onBack}>
        <Text style={styles.backActionText}>Back</Text>
      </Pressable>
      <Pressable style={[styles.nextAction, nextDisabled && styles.nextDisabled]} onPress={onNext} disabled={nextDisabled}>
        <Text style={styles.nextActionText}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  singleWrap: { position: "absolute", left: 16, right: 16, bottom: 18 },
  rowWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: "row",
    gap: 10,
  },
  backAction: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  backActionText: { color: "#334155", fontSize: 20, fontFamily: font.semiBold },
  nextAction: {
    flex: 1,
    backgroundColor: "#0F9445",
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nextDisabled: { backgroundColor: "#8ECFA8" },
  nextActionText: { color: "#FFF", fontSize: 20, fontFamily: font.bold },
});

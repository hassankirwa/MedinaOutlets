import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { font } from "../theme/fonts";
import { bottomSafeInset } from "../utils/safeAreaInsets";

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
  const insets = useSafeAreaInsets();
  const bottomPadding = bottomSafeInset(insets) + 12;

  if (!showBack) {
    return (
      <View style={[styles.singleWrap, styles.sticky, { paddingBottom: bottomPadding }]}>
        <Pressable
          style={[styles.nextAction, styles.nextActionFull, nextDisabled && styles.nextDisabled]}
          onPress={onNext}
          disabled={nextDisabled}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
        >
          <Text style={styles.nextActionText}>{nextLabel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.rowWrap, styles.sticky, { paddingBottom: bottomPadding }]}>
      <Pressable
        style={styles.backAction}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Text style={styles.backActionText}>Back</Text>
      </Pressable>
      <Pressable
        style={[styles.nextAction, nextDisabled && styles.nextDisabled]}
        onPress={onNext}
        disabled={nextDisabled}
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
      >
        <Text style={styles.nextActionText}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sticky: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
    }),
  },
  singleWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D4DEE8",
    backgroundColor: "#FFFFFF",
  },
  rowWrap: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#D4DEE8",
    backgroundColor: "#FFFFFF",
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
  nextActionFull: { flex: undefined, width: "100%" },
  nextDisabled: { backgroundColor: "#8ECFA8" },
  nextActionText: { color: "#FFF", fontSize: 20, fontFamily: font.bold },
});

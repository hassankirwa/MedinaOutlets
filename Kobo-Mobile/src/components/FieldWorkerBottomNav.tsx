import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFieldWorkerNavActions } from "../context/FieldWorkerNavContext";
import { font } from "../theme/fonts";

export type FieldWorkerNavTab = "home" | "projects" | "submissions" | "profile";

const TAB_ICON_SIZE = 24;
const ICON_SLOT = 30;
const FAB_SIZE = 52;
const FAB_ICON_SIZE = 25;
/** Padding under tab icons row before labels */
const BAR_PADDING_TOP = 17;
/** FAB circle vertically aligns with tab icon centers */
const FAB_OVERLAY_TOP = BAR_PADDING_TOP + ICON_SLOT / 2 - FAB_SIZE / 2;

export function FieldWorkerBottomNav({
  active,
  addOutletEnabled,
  addOutletBlockedMessage,
}: {
  active: FieldWorkerNavTab;
  addOutletEnabled: boolean;
  addOutletBlockedMessage: string;
}) {
  const insets = useSafeAreaInsets();
  const { goHome, goProjects, goSubmissions, goProfile, requestNewOutlet } = useFieldWorkerNavActions();

  const handleFab = () => {
    if (!addOutletEnabled) {
      Alert.alert("Cannot add outlet", addOutletBlockedMessage);
      return;
    }
    requestNewOutlet();
  };

  const safeBottom = Math.max(insets.bottom, 0);

  return (
    <View style={[styles.bottomNav, { paddingBottom: safeBottom }]}>
      <View style={[styles.tabsRow, { paddingTop: BAR_PADDING_TOP }]}>
        <NavItem
          label="Home"
          active={active === "home"}
          icon={<Ionicons name="home" size={TAB_ICON_SIZE} color={active === "home" ? "#169447" : "#64748B"} />}
          onPress={goHome}
        />
        <NavItem
          label="Projects"
          active={active === "projects"}
          icon={
            <MaterialCommunityIcons
              name={active === "projects" ? "briefcase" : "briefcase-outline"}
              size={TAB_ICON_SIZE}
              color={active === "projects" ? "#169447" : "#64748B"}
            />
          }
          onPress={goProjects}
        />
        <View style={styles.fabColumnSpacer} pointerEvents="none" />
        <NavItem
          label="Submissions"
          active={active === "submissions"}
          icon={
            <Feather name="file-text" size={TAB_ICON_SIZE} color={active === "submissions" ? "#169447" : "#64748B"} />
          }
          onPress={goSubmissions}
        />
        <NavItem
          label="Profile"
          active={active === "profile"}
          icon={
            <Ionicons
              name={active === "profile" ? "person" : "person-outline"}
              size={TAB_ICON_SIZE}
              color={active === "profile" ? "#169447" : "#64748B"}
            />
          }
          onPress={goProfile}
        />
      </View>
      <View style={[styles.fabOverlay, { top: FAB_OVERLAY_TOP }]} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New outlet"
          style={[styles.newOutletFab, !addOutletEnabled && styles.newOutletFabDisabled]}
          onPress={handleFab}
        >
          <Ionicons name="add" size={FAB_ICON_SIZE} color="#FFFFFF" />
        </Pressable>
        <Text style={[styles.navLabelFab, !addOutletEnabled && styles.navLabelMuted]}>New Outlet</Text>
      </View>
    </View>
  );
}

function NavItem({
  label,
  active = false,
  icon,
  onPress,
}: {
  label: string;
  active?: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      onPress={onPress}
      style={styles.navItemPressable}
    >
      <View style={styles.iconSlot}>{icon}</View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 4,
    zIndex: 20,
    elevation: 24,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 6,
  },
  fabColumnSpacer: {
    width: FAB_SIZE + 12,
    flexShrink: 0,
  },
  fabOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30,
    elevation: 28,
  },
  navItemPressable: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    zIndex: 40,
    elevation: 32,
  },
  iconSlot: {
    width: ICON_SLOT,
    height: ICON_SLOT,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { fontSize: 11, color: "#64748B", fontFamily: font.regular },
  navLabelFab: {
    fontSize: 11,
    color: "#64748B",
    fontFamily: font.regular,
    marginTop: 6,
    textAlign: "center",
  },
  navLabelActive: { color: "#169447", fontFamily: font.bold },
  navLabelMuted: { color: "#94A3B8" },
  newOutletFab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: "#169447",
    alignItems: "center",
    justifyContent: "center",
  },
  newOutletFabDisabled: { backgroundColor: "#94A3B8" },
});

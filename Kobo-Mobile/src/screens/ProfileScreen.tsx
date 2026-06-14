import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  apiChangePassword,
  apiFetchNotificationPreferences,
  apiMyWardAssignments,
  apiUpdateNotificationPreferences,
  apiUploadProfileAvatar,
  type AuthUser,
  type CollectorNotificationPreferences,
  type MyWardAssignmentProject,
} from "../api/client";
import { requestLocalNotificationPermissions } from "../notifications/registerPushToken";
import { canUseDeviceNotifications } from "../notifications/expoNotificationsSupport";
import { FieldWorkerBottomNav, type FieldWorkerNavTab } from "../components/FieldWorkerBottomNav";
import { font } from "../theme/fonts";
import {
  computeAddOutletEnabled,
  FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE,
  sortAssignmentsForDisplay,
} from "../utils/fieldWorkerProjects";

type Props = {
  token: string | null;
  user: AuthUser | null;
  navActive: FieldWorkerNavTab;
  onBack: () => void;
  refreshUser: () => Promise<void>;
};

export function ProfileScreen({ token, user, navActive, onBack, refreshUser }: Props) {
  const insets = useSafeAreaInsets();
  const [assignments, setAssignments] = useState<MyWardAssignmentProject[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);

  useEffect(() => {
    if (!token) {
      setAssignments([]);
      setAssignmentsLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await apiMyWardAssignments(token);
        if (!cancelled) {
          setAssignments(sortAssignmentsForDisplay(rows));
        }
      } catch {
        if (!cancelled) {
          setAssignments([]);
        }
      } finally {
        if (!cancelled) {
          setAssignmentsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const addOutletEnabled = useMemo(
    () => computeAddOutletEnabled(user, assignments, assignmentsLoaded),
    [user, assignments, assignmentsLoaded],
  );

  const [pickedPhotoUri, setPickedPhotoUri] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState<CollectorNotificationPreferences | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [localAlertsDenied, setLocalAlertsDenied] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotifPrefs(null);
      return;
    }
    let cancelled = false;
    setNotifLoading(true);
    void (async () => {
      try {
        const prefs = await apiFetchNotificationPreferences(token);
        if (!cancelled) {
          setNotifPrefs(prefs);
        }
      } catch {
        if (!cancelled) {
          setNotifPrefs(null);
        }
      } finally {
        if (!cancelled) {
          setNotifLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const saveNotificationPrefs = useCallback(async () => {
    if (!token || !notifPrefs) {
      return;
    }
    setSavingNotif(true);
    try {
      const payload: CollectorNotificationPreferences = {
        ...notifPrefs,
        channels: { ...notifPrefs.channels, push: false },
      };
      const saved = await apiUpdateNotificationPreferences(token, payload);
      setNotifPrefs(saved);
      if (saved.sync_reminder !== false) {
        const granted = await requestLocalNotificationPermissions();
        setLocalAlertsDenied(!granted);
      }
      Alert.alert("Saved", "Notification preferences updated.");
    } catch (e) {
      Alert.alert("Notifications", e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSavingNotif(false);
    }
  }, [token, notifPrefs]);

  const displayAvatarUri = pickedPhotoUri ?? user?.avatar_url ?? null;
  const fallbackLetter =
    user?.name?.trim()?.charAt(0)?.toUpperCase() ?? user?.email?.trim()?.charAt(0)?.toUpperCase() ?? "?";

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo library access to choose a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }
    setPickedPhotoUri(result.assets[0].uri);
  }, []);

  const savePhoto = useCallback(async () => {
    if (!token || !pickedPhotoUri) {
      return;
    }
    setSavingPhoto(true);
    try {
      await apiUploadProfileAvatar(token, pickedPhotoUri);
      await refreshUser();
      setPickedPhotoUri(null);
      Alert.alert("Saved", "Your profile photo was updated.");
    } catch (e) {
      Alert.alert("Photo", e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSavingPhoto(false);
    }
  }, [token, pickedPhotoUri, refreshUser]);

  const savePassword = useCallback(async () => {
    if (!token) {
      return;
    }
    if (!currentPassword.trim()) {
      Alert.alert("Password", "Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Password", "New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password", "New password and confirmation do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await apiChangePassword(token, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Saved", "Your password was updated.");
    } catch (e) {
      Alert.alert("Password", e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingPassword(false);
    }
  }, [token, currentPassword, newPassword, confirmPassword]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.headerSubtitle}>{user?.name ?? "Account"}</Text>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 130 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Profile photo</Text>
          <View style={styles.card}>
            <Pressable style={styles.avatarWrap} onPress={pickPhoto}>
              {displayAvatarUri ? (
                <Image source={{ uri: displayAvatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{fallbackLetter}</Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text style={styles.hint}>Tap the photo to choose from your library.</Text>
            <Pressable
              style={[styles.primaryBtn, (!pickedPhotoUri || savingPhoto) && styles.btnDisabled]}
              onPress={savePhoto}
              disabled={!pickedPhotoUri || savingPhoto}
            >
              {savingPhoto ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Save photo</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            {notifLoading ? (
              <ActivityIndicator color="#169447" />
            ) : notifPrefs ? (
              <>
                <Text style={styles.notifIntro}>
                  Review and assignment updates appear in the app.
                  {canUseDeviceNotifications()
                    ? " Sync reminders can alert on this device."
                    : " On-device sync alerts need a development build on Android (Expo Go shows in-app only)."}
                </Text>
                <ToggleRow
                  label="Submission review updates"
                  value={notifPrefs.submission_review ?? true}
                  onToggle={() =>
                    setNotifPrefs({ ...notifPrefs, submission_review: !(notifPrefs.submission_review ?? true) })
                  }
                />
                <ToggleRow
                  label="Project assignments"
                  value={notifPrefs.project_assignment ?? true}
                  onToggle={() =>
                    setNotifPrefs({
                      ...notifPrefs,
                      project_assignment: !(notifPrefs.project_assignment ?? true),
                    })
                  }
                />
                <ToggleRow
                  label="Sync reminders on device"
                  value={notifPrefs.sync_reminder ?? true}
                  disabled={!canUseDeviceNotifications()}
                  onToggle={async () => {
                    if (!canUseDeviceNotifications()) {
                      return;
                    }
                    const next = !(notifPrefs.sync_reminder ?? true);
                    if (next) {
                      const granted = await requestLocalNotificationPermissions();
                      setLocalAlertsDenied(!granted);
                    }
                    setNotifPrefs({ ...notifPrefs, sync_reminder: next });
                  }}
                />
                {localAlertsDenied ? (
                  <Pressable onPress={() => void Linking.openSettings()}>
                    <Text style={styles.permissionLink}>
                      Device alerts are off. Open settings to allow sync reminders on this phone.
                    </Text>
                  </Pressable>
                ) : null}
                <ToggleRow
                  label="In-app alerts"
                  value={notifPrefs.channels?.in_app ?? true}
                  onToggle={() =>
                    setNotifPrefs({
                      ...notifPrefs,
                      channels: { ...notifPrefs.channels, in_app: !(notifPrefs.channels?.in_app ?? true) },
                    })
                  }
                />
                <Pressable
                  style={[styles.primaryBtn, savingNotif && styles.btnDisabled]}
                  onPress={() => void saveNotificationPrefs()}
                  disabled={savingNotif}
                >
                  {savingNotif ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Save notifications</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Text style={styles.hint}>Could not load notification settings.</Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>Password</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Current password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Required"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowCurrent((x) => !x)}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>New password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 8 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowNew((x) => !x)}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Confirm new password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowConfirm((x) => !x)}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
              </Pressable>
            </View>

            <Pressable
              style={[styles.primaryBtn, savingPassword && styles.btnDisabled]}
              onPress={savePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Save password</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.emailNote}>{user?.email}</Text>
        </ScrollView>

        <FieldWorkerBottomNav
          active={navActive}
          addOutletEnabled={addOutletEnabled}
          addOutletBlockedMessage={FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.toggleRow, disabled && styles.toggleRowDisabled]} onPress={onToggle} disabled={disabled}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </Pressable>
  );
}

const AVATAR = 112;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: "#F4F7F6" },
  header: {
    backgroundColor: "#178E47",
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitleBlock: { flex: 1 },
  headerTitle: { color: "#FFFFFF", fontSize: 22, fontFamily: font.extraBold },
  headerSubtitle: { color: "#DAF5E2", fontSize: 13, marginTop: 4, fontFamily: font.regular },
  scroll: { padding: 16, gap: 10 },
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: 13,
    color: "#475569",
    marginTop: 6,
    marginBottom: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  avatarWrap: {
    alignSelf: "center",
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 4,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCFCE7",
  },
  avatarLetter: { fontSize: 40, fontFamily: font.bold, color: "#166534" },
  avatarBadge: {
    position: "absolute",
    right: 5,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#169447",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  hint: { fontFamily: font.regular, fontSize: 13, color: "#64748B", textAlign: "center" },
  notifIntro: {
    fontFamily: font.regular,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  permissionLink: {
    fontFamily: font.semiBold,
    fontSize: 12,
    color: "#B45309",
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toggleRowDisabled: { opacity: 0.45 },
  toggleLabel: { flex: 1, fontFamily: font.regular, fontSize: 14, color: "#334155", paddingRight: 12 },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#CBD5E1",
    padding: 3,
    justifyContent: "center",
  },
  toggleTrackOn: { backgroundColor: "#86EFAC" },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  toggleThumbOn: { alignSelf: "flex-end" },
  fieldLabel: { fontFamily: font.semiBold, fontSize: 13, color: "#334155" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    minHeight: 48,
  },
  input: { flex: 1, fontFamily: font.regular, fontSize: 15, color: "#0F172A", paddingVertical: 10 },
  eyeBtn: { padding: 6 },
  primaryBtn: {
    backgroundColor: "#169447",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#FFFFFF", fontFamily: font.bold, fontSize: 16 },
  emailNote: {
    textAlign: "center",
    fontFamily: font.regular,
    fontSize: 13,
    color: "#64748B",
    marginTop: 8,
  },
});

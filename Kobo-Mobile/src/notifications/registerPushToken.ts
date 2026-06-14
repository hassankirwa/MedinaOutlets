import { canUseDeviceNotifications, getExpoNotifications } from "./expoNotificationsSupport";

export async function ensureAndroidNotificationChannel(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    return;
  }
  const { Platform } = await import("react-native");
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync("sync", {
    name: "Sync reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Request OS permission for on-device (local) alerts. No remote push / FCM. */
export async function requestLocalNotificationPermissions(): Promise<boolean> {
  if (!canUseDeviceNotifications()) {
    return false;
  }
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    return false;
  }
  const Device = await import("expo-device");
  if (!Device.isDevice) {
    return false;
  }
  await ensureAndroidNotificationChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Prepare channels and permission for local sync reminders only. */
export async function setupLocalNotifications(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    return;
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  await ensureAndroidNotificationChannel();
  await requestLocalNotificationPermissions();
}

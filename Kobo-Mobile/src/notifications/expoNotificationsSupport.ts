import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

/** Expo Go on Android initializes push machinery on import; avoid loading the module there. */
export function canUseDeviceNotifications(): boolean {
  return !(Platform.OS === "android" && isRunningInExpoGo());
}

export type ExpoNotificationsModule = typeof import("expo-notifications");

let cached: ExpoNotificationsModule | null | undefined;

export async function getExpoNotifications(): Promise<ExpoNotificationsModule | null> {
  if (!canUseDeviceNotifications()) {
    return null;
  }
  if (cached === undefined) {
    cached = await import("expo-notifications");
  }
  return cached;
}

import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";

export async function isOnline(): Promise<boolean> {
  if (Platform.OS === "web") {
    return typeof navigator === "undefined" ? true : navigator.onLine;
  }
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    return false;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  return true;
}

export function isLikelyNetworkError(e: unknown): boolean {
  if (e instanceof TypeError) {
    const m = String(e.message).toLowerCase();
    if (m.includes("network") || m.includes("fetch")) {
      return true;
    }
  }
  const msg = e instanceof Error ? e.message.toLowerCase() : "";
  return (
    msg.includes("network request failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("timeout") ||
    msg.includes("load failed") ||
    msg.includes("internet connection appears")
  );
}

import { Platform } from "react-native";
import type { EdgeInsets } from "react-native-safe-area-context";

/** Minimum space above the system nav / home indicator when insets.bottom is 0 (common on Android edge-to-edge). */
const ANDROID_MIN_BOTTOM_INSET = 24;

export function bottomSafeInset(insets: EdgeInsets): number {
  if (insets.bottom > 0) {
    return insets.bottom;
  }
  return Platform.OS === "android" ? ANDROID_MIN_BOTTOM_INSET : 0;
}

/** Body height of the sticky outlet footer (padding + button row, excluding safe-area padding). */
export const NEW_OUTLET_FOOTER_BODY_HEIGHT = 72;

export function newOutletFooterReserve(insets: EdgeInsets): number {
  return NEW_OUTLET_FOOTER_BODY_HEIGHT + bottomSafeInset(insets) + 12;
}

import { navigateFromNotificationPayload } from "./navigationBridge";
import { canUseDeviceNotifications, getExpoNotifications } from "./expoNotificationsSupport";
import type { MobileNotificationPayload } from "./types";

function parsePayload(data: unknown): MobileNotificationPayload {
  if (!data || typeof data !== "object") {
    return {};
  }
  const row = data as Record<string, unknown>;
  const mobileParams =
    row.mobile_params && typeof row.mobile_params === "object"
      ? (row.mobile_params as MobileNotificationPayload["mobile_params"])
      : null;

  return {
    mobile_screen:
      typeof row.mobile_screen === "string"
        ? (row.mobile_screen as MobileNotificationPayload["mobile_screen"])
        : null,
    mobile_params: mobileParams,
    entity_type: typeof row.entity_type === "string" ? row.entity_type : null,
    entity_id: typeof row.entity_id === "string" ? row.entity_id : null,
  };
}

export function attachNotificationResponseListener(): () => void {
  if (!canUseDeviceNotifications()) {
    return () => {};
  }

  let detach: (() => void) | null = null;
  void getExpoNotifications().then((Notifications) => {
    if (!Notifications) {
      return;
    }
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = parsePayload(response.notification.request.content.data);
      navigateFromNotificationPayload(payload);
    });
    detach = () => sub.remove();
  });

  return () => detach?.();
}

let coldStartHandled = false;

export async function handleColdStartNotification(): Promise<void> {
  // getLastNotificationResponseAsync() is sticky (keeps returning the launch
  // notification), so guard against replaying it more than once per launch.
  if (coldStartHandled) {
    return;
  }
  coldStartHandled = true;

  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    return;
  }
  const last = await Notifications.getLastNotificationResponseAsync();
  if (!last) {
    return;
  }
  const payload = parsePayload(last.notification.request.content.data);
  navigateFromNotificationPayload(payload);
}

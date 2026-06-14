import AsyncStorage from "@react-native-async-storage/async-storage";
import { getExpoNotifications } from "./expoNotificationsSupport";

const PENDING_QUEUE_SINCE_KEY = "kobo_pending_queue_since";
const PENDING_REMINDER_ID_KEY = "kobo_pending_reminder_id";
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function getPendingQueueSince(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(PENDING_QUEUE_SINCE_KEY);
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function setPendingQueueSince(ts: number | null): Promise<void> {
  if (ts === null) {
    await AsyncStorage.removeItem(PENDING_QUEUE_SINCE_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_QUEUE_SINCE_KEY, String(ts));
}

async function getScheduledReminderId(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_REMINDER_ID_KEY);
}

async function setScheduledReminderId(id: string | null): Promise<void> {
  if (!id) {
    await AsyncStorage.removeItem(PENDING_REMINDER_ID_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_REMINDER_ID_KEY, id);
}

export async function cancelPendingSyncReminder(): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    await setPendingQueueSince(null);
    return;
  }
  const existing = await getScheduledReminderId();
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
    await setScheduledReminderId(null);
  }
  await setPendingQueueSince(null);
}

export async function notifySyncResult(params: {
  syncedCount: number;
  failedCount: number;
  stoppedForNetwork: boolean;
  pendingRemaining: number;
  enabled: boolean;
}): Promise<void> {
  if (!params.enabled) {
    return;
  }
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    return;
  }
  const { syncedCount, failedCount, stoppedForNetwork, pendingRemaining } = params;
  if (syncedCount === 0 && failedCount === 0) {
    return;
  }

  let title = "Sync complete";
  let body = `${syncedCount} offline submission${syncedCount === 1 ? "" : "s"} uploaded.`;
  if (failedCount > 0) {
    title = "Sync issues";
    body = `${syncedCount} uploaded, ${failedCount} failed. Open the app to review.`;
  } else if (stoppedForNetwork && pendingRemaining > 0) {
    title = "Partial sync";
    body = `Uploaded ${syncedCount}, but ${pendingRemaining} still waiting. Try again when online.`;
  }

  const { Platform } = await import("react-native");
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { mobile_screen: "notifications" },
      ...(Platform.OS === "android" ? { channelId: "sync" } : {}),
    },
    trigger: null,
  });
}

export async function refreshPendingSyncReminderSchedule(params: {
  pendingCount: number;
  enabled: boolean;
}): Promise<void> {
  const Notifications = await getExpoNotifications();
  if (!Notifications) {
    if (!params.enabled || params.pendingCount <= 0) {
      await setPendingQueueSince(null);
    }
    return;
  }

  if (!params.enabled || params.pendingCount <= 0) {
    await cancelPendingSyncReminder();
    return;
  }

  let since = await getPendingQueueSince();
  if (since === null) {
    since = Date.now();
    await setPendingQueueSince(since);
  }

  const dueAt = since + TWENTY_FOUR_HOURS_MS;
  const delayMs = dueAt - Date.now();
  const { Platform } = await import("react-native");

  if (delayMs <= 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Pending submissions",
        body: `You have ${params.pendingCount} offline submission${params.pendingCount === 1 ? "" : "s"} waiting to sync.`,
        sound: true,
        data: { mobile_screen: "notifications" },
        ...(Platform.OS === "android" ? { channelId: "sync" } : {}),
      },
      trigger: null,
    });
    return;
  }

  const existing = await getScheduledReminderId();
  if (existing) {
    await Notifications.cancelScheduledNotificationAsync(existing);
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Pending submissions",
      body: `You have ${params.pendingCount} offline submission${params.pendingCount === 1 ? "" : "s"} waiting to sync.`,
      sound: true,
      data: { mobile_screen: "notifications" },
      ...(Platform.OS === "android" ? { channelId: "sync" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(60, Math.ceil(delayMs / 1000)),
      repeats: false,
    },
  });
  await setScheduledReminderId(id);
}

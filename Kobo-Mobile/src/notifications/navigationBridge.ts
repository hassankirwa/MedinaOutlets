let handler: ((payload: import("./types").MobileNotificationPayload) => void) | null = null;

export function setNotificationNavigationHandler(
  next: ((payload: import("./types").MobileNotificationPayload) => void) | null,
): void {
  handler = next;
}

export function navigateFromNotificationPayload(payload: import("./types").MobileNotificationPayload): void {
  handler?.(payload);
}

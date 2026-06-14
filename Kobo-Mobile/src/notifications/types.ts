export type MobileNotificationScreen = "submission_details" | "projects" | "notifications";

export type MobileNotificationParams = {
  outlet_id?: string;
  project_id?: string;
};

export type MobileNotificationPayload = {
  mobile_screen?: MobileNotificationScreen | null;
  mobile_params?: MobileNotificationParams | null;
  entity_type?: string | null;
  entity_id?: string | null;
};

export type NotificationNavigationHandler = (payload: MobileNotificationPayload) => void;

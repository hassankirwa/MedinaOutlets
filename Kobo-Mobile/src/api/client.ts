import Constants from "expo-constants";
import type { NewOutletDraft } from "../domain/newOutletTypes";
import { compressDraftPhotosForOutletUpload } from "../utils/compressOutletPhotoForUpload";

const TOKEN_KEY = "kobo_auth_token";

export function getApiBase(): string {
  const fromConfig = Constants.expoConfig?.extra?.apiUrl;
  if (typeof fromConfig === "string" && fromConfig.length > 0) {
    return fromConfig.replace(/\/$/, "");
  }
  return "http://127.0.0.1:8000";
}

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  /** Absolute URL when set on the server */
  avatar_url?: string | null;
  company: { id: number; name: string } | null;
  role: { slug: string; name: string } | null;
};

export type LoginResponse = {
  token: string;
  token_type: string;
  user: AuthUser;
};

export type CreatedOutlet = {
  id: string;
  name: string;
  type: string;
  owner: string;
  phone: string;
  location: string;
  fieldWorker: string;
  accountStatus: string;
  servicedByMedilab: string;
  submittedAt: string;
  /** ISO8601 from API when present (preferred for sorting / detail dates). */
  submitted_at?: string;
  lat: number;
  lng: number;
  status?: string;
  ward_id?: number | null;
  photo_urls?: string[];
  raw?: {
    facility_name?: string;
    outlet_type?: string;
    type_of_account?: string | null;
    medical_facility_status?: string | null;
    outlet_serviced_by_med?: string | null;
    selected_category?: string | null;
    physical_location?: string | null;
    landmark?: string | null;
    remarks?: string | null;
    email?: string | null;
    alternative_phone?: string | null;
  };
};

const AUTH_FETCH_TIMEOUT_MS = 15_000;

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = AUTH_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        `Request timed out after ${Math.round(timeoutMs / 1000)}s. Check EXPO_PUBLIC_API_URL and that Laravel is running (php artisan serve --host=0.0.0.0).`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function errorMessageFromBody(data: unknown, fallback: string): string {
  const d = data as { message?: string; errors?: Record<string, string[]> };
  if (d?.errors) {
    const first = Object.values(d.errors)[0]?.[0];
    if (typeof first === "string") {
      return first;
    }
  }
  if (typeof d?.message === "string") {
    return d.message;
  }
  return fallback;
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  const res = await fetch(`${getApiBase()}/api/auth/forgot-password`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: email.trim() }),
  });
  const data = await parseJson<{ message?: string }>(res);
  const message =
    typeof data?.message === "string"
      ? data.message
      : "If an account exists for this email, you will receive a password reset link shortly.";
  if (!res.ok) {
    let errMsg = message;
    const err = data as unknown as { errors?: Record<string, string[]> };
    const first = err?.errors && Object.values(err.errors)[0]?.[0];
    if (typeof first === "string") {
      errMsg = first;
    }
    throw new Error(errMsg);
  }
  return { message };
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const base = getApiBase();
  let res: Response;
  try {
    res = await fetchWithTimeout(`${base}/api/auth/login`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: email.trim(), password }),
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("timed out")) {
      throw e;
    }
    throw new Error(
      `Cannot reach the API at ${base}. Check EXPO_PUBLIC_API_URL (use port 8000 for Laravel, not 8081 Expo Metro). On a physical device, run: php artisan serve --host=0.0.0.0`,
    );
  }
  const data = await parseJson<LoginResponse>(res);
  if (!res.ok || !data?.token || !data.user) {
    let message = "Sign in failed";
    const err = data as unknown as { message?: string; errors?: Record<string, string[]> };
    if (typeof err?.message === "string") {
      message = err.message;
    }
    const first = err?.errors && Object.values(err.errors)[0]?.[0];
    if (typeof first === "string") {
      message = first;
    }
    throw new Error(message);
  }
  return data;
}

export async function apiMe(token: string): Promise<AuthUser> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/auth/me`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<AuthUser>(res);
  if (!res.ok || !data?.email) {
    throw new Error("Session invalid");
  }
  return data;
}

export async function apiLogout(token: string | null): Promise<void> {
  if (!token) {
    return;
  }
  try {
    await fetch(`${getApiBase()}/api/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    /* ignore */
  }
}

export function draftToOutletPayload(draft: NewOutletDraft): Record<string, unknown> {
  const physicalLocation =
    draft.physicalLocation.trim() ||
    draft.capturedAddress.trim() ||
    draft.landmark.trim() ||
    (draft.gpsCapturedAt ? `${draft.latitude}, ${draft.longitude}` : "");

  return {
    project_id: draft.collectionProjectId ? Number(draft.collectionProjectId) : null,
    branch_id: draft.branchId ?? null,
    questionnaire_id: draft.questionnaireId ?? null,
    captured_place_name: draft.capturedPlaceName || draft.capturedAddress || draft.physicalLocation || draft.landmark || null,
    reverse_geocoded_address: draft.reverseGeocodedAddress || draft.capturedAddress || null,
    captured_address: draft.capturedAddress || null,
    road: draft.road || null,
    suburb: draft.suburb || null,
    captured_ward: draft.capturedWard || null,
    captured_county: draft.capturedCounty || null,
    region: draft.region || null,
    country: draft.country || null,
    facility_name: draft.facilityName,
    owner_name: draft.ownerName,
    business_phone: draft.businessPhone || null,
    alternative_phone: draft.alternativePhone.trim() || null,
    email: draft.email || null,
    physical_location: physicalLocation,
    landmark: draft.landmark || null,
    latitude: draft.latitude,
    longitude: draft.longitude,
    gps_accuracy_meters: draft.accuracyMeters > 0 ? draft.accuracyMeters : null,
    type_of_account: draft.typeOfAccount,
    medical_facility_status: draft.medicalFacilityStatus,
    outlet_serviced_by_med: draft.outletServicedByMed,
    selected_category: draft.selectedCategory,
    remarks: draft.remarks || null,
    photos: draft.photos.map((p) => ({ id: p.id, uri: p.uri })),
  };
}

function parseOutletCreateResponse(res: Response, raw: unknown): CreatedOutlet {
  if (!res.ok) {
    if (res.status === 413) {
      throw new Error(
        errorMessageFromBody(raw, "") ||
          "Upload too large for the server. Fewer or smaller photos may work, or the server upload limit needs to be increased.",
      );
    }
    const detail = errorMessageFromBody(raw, "");
    throw new Error(detail || `Could not submit outlet (HTTP ${res.status})`);
  }
  const row =
    raw && typeof raw === "object" && "data" in raw && raw.data && typeof raw.data === "object"
      ? raw.data
      : raw;
  if (!row || typeof row !== "object" || !("id" in row)) {
    throw new Error("Unexpected response from server");
  }
  return row as CreatedOutlet;
}

/** Multipart field names for binary photos (server stores under `public/outlet-photos`). */
function appendOutletPhotosToFormData(form: FormData, draft: NewOutletDraft): void {
  draft.photos.forEach((p, index) => {
    const uri = p.uri;
    const tail = uri.split("/").pop() || `photo_${index}.jpg`;
    const ext = tail.includes(".") ? tail.split(".").pop()?.toLowerCase() : "";
    const name = tail.includes(".") ? tail : `${tail}.jpg`;
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "heic" ? "image/heic" : "image/jpeg";
    form.append("photo_files[]", {
      uri,
      name,
      type: mime,
    } as unknown as Blob);
  });
}

function appendOutletScalarsToFormData(
  form: FormData,
  draft: NewOutletDraft,
  clientSubmissionKey: string,
  bearerToken: string,
): void {
  const payload = draftToOutletPayload(draft);
  const { photos: _photos, ...scalars } = payload;
  for (const [key, value] of Object.entries(scalars)) {
    if (value === null || value === undefined) {
      continue;
    }
    form.append(key, typeof value === "number" ? String(value) : String(value));
  }
  form.append("client_submission_key", clientSubmissionKey);
  /** Android RN can drop Authorization on multipart; server reads api_bearer_token fallback. */
  form.append("api_bearer_token", bearerToken);
}

export async function apiCreateOutlet(
  token: string,
  draft: NewOutletDraft,
  clientSubmissionKey: string,
): Promise<CreatedOutlet> {
  const authHeaders = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (draft.photos.length === 0) {
    const res = await fetch(`${getApiBase()}/api/outlets`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...draftToOutletPayload(draft),
        client_submission_key: clientSubmissionKey,
      }),
    });
    const raw = await parseJson<{ data?: CreatedOutlet } & CreatedOutlet>(res);
    return parseOutletCreateResponse(res, raw);
  }

  const form = new FormData();
  const draftForUpload =
    draft.photos.length > 0 ? { ...draft, photos: await compressDraftPhotosForOutletUpload(draft.photos) } : draft;
  appendOutletScalarsToFormData(form, draftForUpload, clientSubmissionKey, token);
  appendOutletPhotosToFormData(form, draftForUpload);

  const res = await fetch(`${getApiBase()}/api/outlets`, {
    method: "POST",
    headers: authHeaders,
    body: form,
  });
  const raw = await parseJson<{ data?: CreatedOutlet } & CreatedOutlet>(res);
  return parseOutletCreateResponse(res, raw);
}

export async function apiReverseGeocode(
  token: string,
  latitude: number,
  longitude: number,
): Promise<{
  captured_address?: string | null;
  road?: string | null;
  suburb?: string | null;
  captured_ward?: string | null;
  captured_county?: string | null;
  region?: string | null;
  country?: string | null;
  reverse_geocoded_address?: string | null;
  captured_place_name?: string | null;
  landmark?: string | null;
}> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });
  const res = await fetch(`${getApiBase()}/api/geocode/reverse?${params}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<Record<string, string | null>>(res);
  if (!res.ok || !data) {
    throw new Error(errorMessageFromBody(data, "Could not resolve location from GPS"));
  }
  return data;
}

export type MyWardAssignmentProject = {
  id: string;
  name: string;
  branch?: string;
  branch_id?: string | null;
  status: string;
  questionnaire_id?: string | null;
  questionnaire_name?: string | null;
};

export type MobileBootstrap = {
  assigned_branches: Array<{ id: string; name: string; code?: string | null }>;
  active_projects: MyWardAssignmentProject[];
};

export async function apiMobileBootstrap(token: string): Promise<MobileBootstrap> {
  const res = await fetch(`${getApiBase()}/api/mobile/bootstrap`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<MobileBootstrap>(res);
  if (!res.ok || !data) {
    return { assigned_branches: [], active_projects: [] };
  }
  return data;
}

export async function apiMyWardAssignments(token: string): Promise<MyWardAssignmentProject[]> {
  const res = await fetch(`${getApiBase()}/api/my/ward-assignments`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<{ projects?: MyWardAssignmentProject[] }>(res);
  if (!res.ok || !data?.projects) {
    return [];
  }
  return data.projects;
}

export async function apiUploadProfileAvatar(token: string, localUri: string): Promise<void> {
  const basename = localUri.split("/").pop() || "avatar.jpg";
  const ext = basename.includes(".") ? basename.split(".").pop()?.toLowerCase() : "";
  const mime =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "heic" ? "image/heic" : "image/jpeg";

  const form = new FormData();
  form.append("api_bearer_token", token);
  form.append("avatar", {
    uri: localUri,
    name: basename.includes(".") ? basename : `${basename}.jpg`,
    type: mime,
  } as unknown as Blob);

  const res = await fetch(`${getApiBase()}/api/settings/profile`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  const raw = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(raw, "Could not upload photo"));
  }
}

export async function apiChangePassword(
  token: string,
  params: {
    current_password: string;
    password: string;
    password_confirmation: string;
  },
): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/settings/password`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...params,
      sign_out_other_sessions: false,
    }),
  });
  const raw = await parseJson(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(raw, "Could not update password"));
  }
}

/** Mirrors Laravel `DashboardController`: outlets scoped by role (`created_by` for field collectors). */
export type DashboardStatsResponse = {
  totalOutlets: number;
  outletsByStatus?: Record<string, number>;
  submissionsToday?: number;
};

export async function apiDashboardStats(token: string): Promise<DashboardStatsResponse> {
  const res = await fetch(`${getApiBase()}/api/dashboard/stats`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<DashboardStatsResponse>(res);
  if (!res.ok || data === null || typeof data.totalOutlets !== "number") {
    throw new Error(errorMessageFromBody(data, "Could not load dashboard stats"));
  }
  return data;
}

/** Field collectors: personal submissions only (`created_by` = current user). RBAC-enforced on the server. */
export async function apiListMyOutlets(token: string): Promise<CreatedOutlet[]> {
  const res = await fetch(`${getApiBase()}/api/my/outlets`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<{ data: CreatedOutlet[] }>(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not load submissions"));
  }
  return Array.isArray(data?.data) ? data.data : [];
}

export type CollectorNotificationPreferences = {
  submission_review?: boolean;
  project_assignment?: boolean;
  sync_reminder?: boolean;
  channels?: {
    in_app?: boolean;
    email?: boolean;
    push?: boolean;
  };
};

export type InAppNotificationRow = {
  id: string;
  type: string;
  read_at: string | null;
  created_at: string | null;
  title: string;
  body: string;
  action_path?: string | null;
  page_key?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  mobile_screen?: "submission_details" | "projects" | "notifications" | null;
  mobile_params?: { outlet_id?: string; project_id?: string } | null;
};

export async function apiNotificationUnreadCount(token: string): Promise<number> {
  const res = await fetch(`${getApiBase()}/api/notifications/unread-count`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<{ count?: number }>(res);
  if (!res.ok) {
    return 0;
  }
  return typeof data?.count === "number" ? data.count : 0;
}

export async function apiFetchNotifications(
  token: string,
  params?: { per_page?: number },
): Promise<InAppNotificationRow[]> {
  const qs = new URLSearchParams();
  if (params?.per_page) {
    qs.set("per_page", String(params.per_page));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetch(`${getApiBase()}/api/notifications${suffix}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<{ data?: InAppNotificationRow[] }>(res);
  if (!res.ok) {
    throw new Error(errorMessageFromBody(data, "Could not load notifications"));
  }
  return Array.isArray(data?.data) ? data.data : [];
}

export async function apiMarkNotificationRead(token: string, id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(errorMessageFromBody(data, "Could not mark notification read"));
  }
}

export async function apiMarkAllNotificationsRead(token: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/notifications/read-all`, {
    method: "POST",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(errorMessageFromBody(data, "Could not mark notifications read"));
  }
}

export async function apiFetchNotificationPreferences(
  token: string,
): Promise<CollectorNotificationPreferences> {
  const res = await fetch(`${getApiBase()}/api/settings/notifications`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<{ notification_preferences?: CollectorNotificationPreferences }>(res);
  if (!res.ok || !data?.notification_preferences) {
    throw new Error(errorMessageFromBody(data, "Could not load notification settings"));
  }
  return data.notification_preferences;
}

export async function apiUpdateNotificationPreferences(
  token: string,
  prefs: CollectorNotificationPreferences,
): Promise<CollectorNotificationPreferences> {
  const res = await fetch(`${getApiBase()}/api/settings/notifications`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(prefs),
  });
  const data = await parseJson<{ notification_preferences?: CollectorNotificationPreferences }>(res);
  if (!res.ok || !data?.notification_preferences) {
    throw new Error(errorMessageFromBody(data, "Could not save notification settings"));
  }
  return data.notification_preferences;
}

export async function apiRegisterDeviceToken(
  token: string,
  params: {
    expo_push_token: string;
    platform: "ios" | "android";
    device_name?: string | null;
  },
): Promise<void> {
  const res = await fetch(`${getApiBase()}/api/device-tokens`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await parseJson(res);
    throw new Error(errorMessageFromBody(data, "Could not register device for push"));
  }
}

export async function apiUnregisterDeviceToken(token: string, expoPushToken: string): Promise<void> {
  try {
    await fetch(`${getApiBase()}/api/device-tokens`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ expo_push_token: expoPushToken }),
    });
  } catch {
    /* ignore */
  }
}

export const authStorage = {
  async getToken(): Promise<string | null> {
    const { getItemAsync } = await import("expo-secure-store");
    return getItemAsync(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    const { setItemAsync } = await import("expo-secure-store");
    await setItemAsync(TOKEN_KEY, token);
  },
  async clearToken(): Promise<void> {
    const { deleteItemAsync } = await import("expo-secure-store");
    try {
      await deleteItemAsync(TOKEN_KEY);
    } catch {
      /* */
    }
  },
};

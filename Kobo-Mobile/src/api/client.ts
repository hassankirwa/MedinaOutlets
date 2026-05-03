import Constants from "expo-constants";
import type { NewOutletDraft } from "../domain/newOutletTypes";

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
  };
};

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
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
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: email.trim(), password }),
  });
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
  const res = await fetch(`${getApiBase()}/api/auth/me`, {
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
  return {
    ward_id: draft.wardId ?? null,
    facility_name: draft.facilityName,
    owner_name: draft.ownerName,
    business_phone: draft.businessPhone || null,
    email: draft.email || null,
    physical_location: draft.physicalLocation,
    landmark: draft.landmark || null,
    latitude: draft.latitude,
    longitude: draft.longitude,
    gps_accuracy_meters: draft.accuracyMeters,
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
    const err = raw as unknown as { message?: string };
    throw new Error(typeof err?.message === "string" ? err.message : "Could not submit outlet");
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

function appendOutletScalarsToFormData(form: FormData, draft: NewOutletDraft, clientSubmissionKey: string): void {
  const payload = draftToOutletPayload(draft);
  const { photos: _photos, ...scalars } = payload;
  for (const [key, value] of Object.entries(scalars)) {
    if (value === null || value === undefined) {
      continue;
    }
    form.append(key, typeof value === "number" ? String(value) : String(value));
  }
  form.append("client_submission_key", clientSubmissionKey);
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
  appendOutletScalarsToFormData(form, draft, clientSubmissionKey);
  appendOutletPhotosToFormData(form, draft);

  const res = await fetch(`${getApiBase()}/api/outlets`, {
    method: "POST",
    headers: authHeaders,
    body: form,
  });
  const raw = await parseJson<{ data?: CreatedOutlet } & CreatedOutlet>(res);
  return parseOutletCreateResponse(res, raw);
}

export type MyWardAssignmentProject = {
  id: string;
  name: string;
  county: string;
  status: string;
  wards: { id: number; name: string }[];
};

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

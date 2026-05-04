import type { ApiOutletRow } from "@/lib/outletTransform";

const DEFAULT_API_BASE = "http://127.0.0.1:8000";

export function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return base && base.length > 0 ? base : DEFAULT_API_BASE;
}

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  company: { id: number; name: string } | null;
  role: { slug: string; name: string } | null;
};

export type LoginResponse = {
  token: string;
  token_type: string;
  user: AuthUser;
};

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    let message = "Sign in failed";
    if (typeof data === "object" && data !== null) {
      if (
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
      ) {
        message = (data as { message: string }).message;
      }
      if (
        "errors" in data &&
        typeof (data as { errors: unknown }).errors === "object" &&
        (data as { errors: Record<string, unknown> }).errors !== null
      ) {
        const errors = (data as { errors: Record<string, string[] | string> })
          .errors;
        const firstKey = Object.keys(errors)[0];
        const val = firstKey ? errors[firstKey] : undefined;
        if (Array.isArray(val) && val[0]) {
          message = val[0];
        } else if (typeof val === "string") {
          message = val;
        }
      }
    }
    throw new Error(message);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("token" in data) ||
    !("user" in data) ||
    typeof (data as LoginResponse).token !== "string"
  ) {
    throw new Error("Unexpected response from server");
  }

  return data as LoginResponse;
}

export async function resetPasswordRequest(body: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  const res = await fetch(`${getApiBase()}/api/auth/reset-password`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    let message = "Unable to reset password";
    if (typeof data === "object" && data !== null) {
      if ("message" in data && typeof (data as { message: unknown }).message === "string") {
        message = (data as { message: string }).message;
      }
      if (
        "errors" in data &&
        typeof (data as { errors: unknown }).errors === "object" &&
        (data as { errors: Record<string, unknown> }).errors !== null
      ) {
        const errors = (data as { errors: Record<string, string[] | string> }).errors;
        const firstKey = Object.keys(errors)[0];
        const val = firstKey ? errors[firstKey] : undefined;
        if (Array.isArray(val) && val[0]) {
          message = val[0];
        } else if (typeof val === "string") {
          message = val;
        }
      }
    }
    throw new Error(message);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("message" in data) ||
    typeof (data as { message: unknown }).message !== "string"
  ) {
    throw new Error("Unexpected response from server");
  }

  return data as { message: string };
}

export function isFieldCollectorRole(slug: string | undefined): boolean {
  return slug === "field_collector";
}

export function readAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("authToken");
}

export function readUserProfile(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem("userProfile");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

async function readJsonResponse<T>(res: Response, errorPrefix: string): Promise<T> {
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  if (!res.ok) {
    const msg =
      parsed &&
      typeof parsed === "object" &&
      parsed !== null &&
      "message" in parsed &&
      typeof (parsed as { message: unknown }).message === "string"
        ? (parsed as { message: string }).message
        : `${errorPrefix} (${res.status})`;
    throw new Error(msg);
  }
  return parsed as T;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const token = readAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    init.body !== undefined &&
    !headers.has("Content-Type") &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userProfile");
    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  return res;
}

export async function meRequest(): Promise<AuthUser> {
  const res = await apiFetch("/api/auth/me");
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error("Session check failed");
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("id" in data) ||
    !("email" in data)
  ) {
    throw new Error("Unexpected profile response");
  }
  return data as AuthUser;
}

/** Refresh cached profile after avatar or name changes so sidebar/header stay in sync. */
export async function refreshStoredUserProfile(): Promise<void> {
  const user = await meRequest();
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem("userProfile", JSON.stringify(user));
  localStorage.setItem("userRole", user.role?.slug ?? "");
  window.dispatchEvent(new Event("kobo-profile"));
}

export async function logoutRequest(): Promise<void> {
  const token = readAuthToken();
  if (!token) {
    return;
  }
  try {
    await apiFetch("/api/auth/logout", { method: "POST", body: "{}" });
  } catch {
    /* ignore network errors on logout */
  }
}

export type DashboardStats = {
  totalOutlets: number;
  countiesCovered: number;
  fieldWorkers: number;
  submissionsToday: number;
  dataQualityPct: number;
  outletsByType: Record<string, number>;
  outletsByStatus: Record<string, number>;
  registeredOutlets: number;
  unregisteredOutlets: number;
  medilabYes: number;
  medilabNo: number;
  fieldWorkerStats: { name: string; outlets: number; pct: string }[];
  submissionTrends: { date: string; outlets: number }[];
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch("/api/dashboard/stats");
  return readJsonResponse<DashboardStats>(res, "Failed to load dashboard");
}

export async function fetchOutletsApi(): Promise<ApiOutletRow[]> {
  const res = await apiFetch("/api/outlets");
  const data = await readJsonResponse<{ data?: ApiOutletRow[] }>(res, "Failed to load outlets");
  if (typeof data === "object" && data !== null && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export async function fetchOutletById(id: string | number): Promise<ApiOutletRow> {
  const res = await apiFetch(`/api/outlets/${id}`);
  const data = await readJsonResponse<{ data?: ApiOutletRow }>(res, "Failed to load submission");
  if (typeof data === "object" && data !== null && data.data && typeof data.data === "object") {
    return data.data as ApiOutletRow;
  }
  throw new Error("Unexpected submission response");
}

export type OutletReviewStatus = "pending" | "approved" | "rejected";

/** Roles allowed to PATCH outlet status per backend OutletPolicy::update */
export function canReviewOutletSubmissions(roleSlug: string | undefined): boolean {
  return (
    roleSlug === "super_admin" ||
    roleSlug === "company_admin" ||
    roleSlug === "qa_officer"
  );
}

export async function updateOutletStatus(
  outletId: string | number,
  status: OutletReviewStatus,
): Promise<ApiOutletRow> {
  const res = await apiFetch(`/api/outlets/${outletId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  const data: unknown = await readJsonResponse(res, "Failed to update outlet");
  if (typeof data === "object" && data !== null && "data" in data) {
    const inner = (data as { data: unknown }).data;
    if (typeof inner === "object" && inner !== null) {
      return inner as ApiOutletRow;
    }
  }
  if (typeof data === "object" && data !== null && "id" in data) {
    return data as ApiOutletRow;
  }
  throw new Error("Unexpected update response");
}

export async function bulkUpdateOutletStatuses(
  outletIds: (string | number)[],
  status: OutletReviewStatus,
): Promise<ApiOutletRow[]> {
  const res = await apiFetch("/api/outlets/bulk-status", {
    method: "PATCH",
    body: JSON.stringify({
      outlet_ids: outletIds.map((id) => Number(id)),
      status,
    }),
  });
  const data = await readJsonResponse<{ data?: ApiOutletRow[] }>(res, "Failed to bulk update outlets");
  if (typeof data === "object" && data !== null && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export type OutletImportResult = {
  imported: number;
  errors: { row: number; messages: string[] }[];
};

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const star = /filename\*=(?:UTF-8'')?([^;\s]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].replace(/^"+|"+$/g, ""));
    } catch {
      return star[1];
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) {
    return quoted[1];
  }
  const plain = /filename=([^;\s]+)/i.exec(header);
  if (plain?.[1]) {
    return plain[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

export async function downloadOutletSpreadsheetBlob(
  pathWithQuery: string,
  filename: string,
): Promise<void> {
  const res = await apiFetch(pathWithQuery, {
    headers: { Accept: "*/*" },
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const parsed: unknown = JSON.parse(await res.text());
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "message" in parsed &&
        typeof (parsed as { message: unknown }).message === "string"
      ) {
        msg = (parsed as { message: string }).message;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    parseContentDispositionFilename(res.headers.get("Content-Disposition")) ?? filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importOutletsSpreadsheet(file: File): Promise<OutletImportResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch("/api/outlets/spreadsheet/import", {
    method: "POST",
    body: fd,
  });
  return readJsonResponse<OutletImportResult>(res, "Import failed");
}

export type ProjectsSummary = {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  paused_projects: number;
  draft_projects?: number;
  total_field_workers: number;
};

export type ProjectRowApi = {
  id: string;
  county_id: number;
  name: string;
  county: string;
  status: "Active" | "Completed" | "Paused" | "Draft";
  period_start: string;
  period_end: string;
  outlets_collected: number;
  field_workers: number;
  progress: number;
  description?: string | null;
};

export type CountyApiRow = {
  id: number;
  name: string;
  code: string | null;
  wards_count?: number;
};

export type WardApiRow = {
  id: number;
  county_id?: number;
  name: string;
};

export async function fetchCountyDetail(countyId: number): Promise<{ wards: WardApiRow[] }> {
  const res = await apiFetch(`/api/counties/${countyId}`);
  const data = await readJsonResponse<{ wards?: WardApiRow[] }>(res, "Failed to load county");
  if (typeof data === "object" && data !== null && Array.isArray(data.wards)) {
    return { wards: data.wards };
  }
  return { wards: [] };
}

export async function fetchCounties(): Promise<CountyApiRow[]> {
  const res = await apiFetch("/api/counties");
  const data = await readJsonResponse<{ data?: CountyApiRow[] }>(res, "Failed to load counties");
  if (typeof data === "object" && data !== null && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

export type ProjectWriteStatus = "draft" | "active" | "paused" | "completed";

export type WardAssignmentInput = { ward_id: number; user_id: number };

export type CreateProjectBody = {
  name: string;
  county_id: number;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: ProjectWriteStatus;
  field_worker_ids?: number[];
  /** When set (including []), replaces ward→collector mapping and syncs project membership from these picks. */
  ward_assignments?: WardAssignmentInput[];
  company_id?: number;
};

export async function createProject(body: CreateProjectBody): Promise<{ project: ProjectRowApi }> {
  const res = await apiFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJsonResponse(res, "Failed to create project");
}

export async function updateProject(
  projectId: string | number,
  body: Partial<CreateProjectBody>,
): Promise<{ project: ProjectRowApi }> {
  const res = await apiFetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return readJsonResponse(res, "Failed to update project");
}

export async function deleteProject(projectId: string | number): Promise<void> {
  const res = await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
  await readJsonResponse<{ ok?: boolean }>(res, "Failed to delete project");
}

export async function fetchProjects(): Promise<{
  summary: ProjectsSummary;
  projects: ProjectRowApi[];
}> {
  const res = await apiFetch("/api/projects");
  return readJsonResponse(res, "Failed to load projects");
}

export type FieldWorkersSummary = {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  projects_assigned: number;
};

export type FieldWorkerRowApi = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  county: string;
  projects: number;
  outlets_collected: number;
  this_month: number;
  status: "Active" | "Inactive" | "Suspended";
  avatar: string;
};

export async function fetchFieldWorkers(): Promise<{
  summary: FieldWorkersSummary;
  workers: FieldWorkerRowApi[];
}> {
  const res = await apiFetch("/api/field-workers");
  return readJsonResponse(res, "Failed to load field workers");
}

export type CompanyListRow = { id: number; name: string };

export async function fetchCompaniesList(): Promise<CompanyListRow[]> {
  const res = await apiFetch("/api/companies");
  const data = await readJsonResponse<{ data?: CompanyListRow[] }>(res, "Failed to load companies");
  return Array.isArray(data.data) ? data.data : [];
}

export type CreateFieldWorkerBody = {
  name: string;
  email: string;
  phone: string;
  county_id?: number | null;
  company_id?: number;
};

export async function createFieldWorker(body: CreateFieldWorkerBody): Promise<{
  worker: FieldWorkerRowApi;
  message: string;
  invitation_sent: boolean;
}> {
  const res = await apiFetch("/api/field-workers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJsonResponse(res, "Failed to create field worker");
}

export type UpdateFieldWorkerBody = {
  name?: string;
  email?: string;
  phone?: string;
  county_id?: number | null;
  account_status?: "active" | "inactive" | "suspended";
};

export async function updateFieldWorker(
  id: string,
  body: UpdateFieldWorkerBody,
): Promise<{ worker: FieldWorkerRowApi; message: string }> {
  const res = await apiFetch(`/api/field-workers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJsonResponse(res, "Failed to update field worker");
}

export async function deactivateFieldWorker(id: string): Promise<{ message: string }> {
  const res = await apiFetch(`/api/field-workers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return readJsonResponse(res, "Failed to deactivate field worker");
}

export type NotificationPreferences = {
  new_submission: boolean;
  sla_breach: boolean;
  rejected_submission: boolean;
  weekly_summary: boolean;
  channels: { in_app: boolean; email: boolean };
};

export type SecurityPreferences = {
  sign_out_other_sessions_after_password_change: boolean;
  require_two_factor: boolean;
};

export type CompanyWorkspaceSettings = {
  users_roles: {
    super_admin_manage_config: boolean;
    data_manager_approve_reject: boolean;
    field_supervisor_review: boolean;
    viewer_reports_only: boolean;
  };
  data_collection_rules: {
    require_phone_gps: boolean;
    duplicate_detect_radius_m: number;
    validation_strictness: string;
    min_photo_count: number;
  };
  workflow_approvals: {
    approval_mode: string;
    sla_hours: number;
  };
  map_defaults: {
    center_lat: number;
    center_lng: number;
    zoom: number;
    geofence_validation: boolean;
  };
};

export type WorkspaceCompanyPayload = {
  id: number;
  name: string;
  code: string | null;
  default_county_id: number | null;
  default_county_name?: string | null;
  timezone: string;
  date_format: string;
  project_status_default: string;
  settings: CompanyWorkspaceSettings;
};

export type WorkspaceSettingsPayload = {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    avatar_url?: string | null;
    role: { slug: string; name: string } | null;
  };
  notification_preferences: NotificationPreferences;
  security_preferences: SecurityPreferences;
  company: WorkspaceCompanyPayload | null;
};

export async function fetchWorkspaceSettings(): Promise<WorkspaceSettingsPayload> {
  const res = await apiFetch("/api/settings/workspace");
  return readJsonResponse(res, "Failed to load settings");
}

/** Merge workspace `user` (including `avatar_url`) into localStorage so sidebar/header update immediately. */
export function syncStoredProfileFromWorkspace(ws: WorkspaceSettingsPayload): void {
  if (typeof window === "undefined") {
    return;
  }
  const prev = readUserProfile();
  if (!prev) {
    return;
  }
  const next: AuthUser = {
    ...prev,
    id: ws.user.id,
    name: ws.user.name,
    email: ws.user.email,
    avatar_url: ws.user.avatar_url ?? null,
    role: ws.user.role ?? prev.role,
  };
  localStorage.setItem("userProfile", JSON.stringify(next));
  window.dispatchEvent(new Event("kobo-profile"));
}

export type AssignedWorkerApi = { id: string; name: string; email: string };

export type ProjectWardRowApi = {
  id: number;
  name: string;
  assigned_user_id: number | null;
  assigned_user_name?: string | null;
};

export type ProjectDetailPayload = {
  project: {
    id: string;
    county_id: number;
    name: string;
    description?: string | null;
    county: string;
    status: "Active" | "Completed" | "Paused" | "Draft";
    period_start: string;
    period_end: string;
    outlets_collected: number;
    progress: number;
    field_workers: number;
    start_date?: string | null;
    end_date?: string | null;
  };
  assigned_workers: AssignedWorkerApi[];
  wards?: ProjectWardRowApi[];
  stats?: { outlet_contributors: number };
};

export async function fetchProjectDetail(projectId: string | number): Promise<ProjectDetailPayload> {
  const res = await apiFetch(`/api/projects/${projectId}`);
  return readJsonResponse(res, "Failed to load project");
}

export async function syncProjectAssignments(
  projectId: string | number,
  userIds: number[],
): Promise<{ assigned_workers: AssignedWorkerApi[] }> {
  const res = await apiFetch(`/api/projects/${projectId}/assignments`, {
    method: "PUT",
    body: JSON.stringify({ user_ids: userIds }),
  });
  return readJsonResponse(res, "Failed to update assignments");
}

export async function syncProjectWardAssignments(
  projectId: string | number,
  assignments: WardAssignmentInput[],
): Promise<{ wards: ProjectWardRowApi[]; assigned_workers: AssignedWorkerApi[] }> {
  const res = await apiFetch(`/api/projects/${projectId}/ward-assignments`, {
    method: "PUT",
    body: JSON.stringify({ assignments }),
  });
  return readJsonResponse(res, "Failed to save ward assignments");
}

export type MyWardAssignmentProject = {
  id: string;
  name: string;
  county: string;
  status: string;
  wards: { id: number; name: string }[];
};

export async function fetchMyWardAssignments(): Promise<{ projects: MyWardAssignmentProject[] }> {
  const res = await apiFetch("/api/my/ward-assignments");
  return readJsonResponse(res, "Failed to load assignments");
}

export async function updateWorkspaceProfile(
  patch:
    | {
        name?: string;
        phone?: string | null;
        remove_avatar?: boolean;
      }
    | FormData,
): Promise<WorkspaceSettingsPayload> {
  const isForm = typeof FormData !== "undefined" && patch instanceof FormData;
  /** POST is required for reliable multipart uploads; PATCH often drops file bodies (browser/proxy). */
  const res = await apiFetch("/api/settings/profile", {
    method: isForm ? "POST" : "PATCH",
    body: isForm ? patch : JSON.stringify(patch),
  });
  return readJsonResponse(res, "Failed to save profile");
}

export async function updateWorkspaceCompany(patch: {
  name?: string;
  code?: string | null;
  company_id?: number;
}): Promise<WorkspaceSettingsPayload> {
  const res = await apiFetch("/api/settings/company", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return readJsonResponse(res, "Failed to save organization");
}

export type UpdateOrganizationPatch = {
  name?: string;
  code?: string | null;
  company_id?: number;
  default_county_id?: number | null;
  timezone?: string;
  date_format?: string;
  project_status_default?: string;
  users_roles?: Partial<CompanyWorkspaceSettings["users_roles"]>;
  data_collection_rules?: Partial<CompanyWorkspaceSettings["data_collection_rules"]>;
  workflow_approvals?: Partial<CompanyWorkspaceSettings["workflow_approvals"]>;
  map_defaults?: Partial<CompanyWorkspaceSettings["map_defaults"]>;
};

export async function updateWorkspaceOrganization(
  patch: UpdateOrganizationPatch,
): Promise<WorkspaceSettingsPayload> {
  const res = await apiFetch("/api/settings/organization", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return readJsonResponse(res, "Failed to save organization");
}

export async function updatePassword(body: {
  current_password: string;
  password: string;
  password_confirmation: string;
  sign_out_other_sessions?: boolean;
}): Promise<{ message: string }> {
  const res = await apiFetch("/api/settings/password", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return readJsonResponse(res, "Failed to update password");
}

export async function updateSecurityPreferences(patch: {
  sign_out_other_sessions_after_password_change?: boolean;
  require_two_factor?: boolean;
}): Promise<WorkspaceSettingsPayload> {
  const res = await apiFetch("/api/settings/security", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return readJsonResponse(res, "Failed to save security preferences");
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences> & {
    channels?: Partial<NotificationPreferences["channels"]>;
  },
): Promise<{ notification_preferences: NotificationPreferences }> {
  const res = await apiFetch("/api/settings/notifications", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return readJsonResponse(res, "Failed to save notification preferences");
}

export type InAppNotificationRow = {
  id: string;
  type: string;
  read_at: string | null;
  created_at: string | null;
  title: string;
  body: string;
  action_path: string | null;
  page_key: string | null;
  entity_type: string | null;
  entity_id: string | null;
};

export async function fetchNotificationUnreadCount(): Promise<number> {
  const res = await apiFetch("/api/notifications/unread-count");
  const data = await readJsonResponse<{ count?: number }>(res, "Failed to load unread count");
  return typeof data.count === "number" ? data.count : 0;
}

export async function fetchNotificationsPage(params?: {
  per_page?: number;
}): Promise<{
  data: InAppNotificationRow[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}> {
  const q = new URLSearchParams();
  if (params?.per_page) {
    q.set("per_page", String(params.per_page));
  }
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await apiFetch(`/api/notifications${suffix}`);
  return readJsonResponse(res, "Failed to load notifications");
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: "POST",
    body: "{}",
  });
  await readJsonResponse(res, "Failed to mark notification read");
}

export async function markAllNotificationsRead(): Promise<void> {
  const res = await apiFetch("/api/notifications/read-all", {
    method: "POST",
    body: "{}",
  });
  await readJsonResponse(res, "Failed to mark notifications read");
}

/** Permanently removes all in-app notifications for the current user. */
export async function clearAllNotifications(): Promise<void> {
  const res = await apiFetch("/api/notifications", {
    method: "DELETE",
  });
  await readJsonResponse(res, "Failed to clear notifications");
}

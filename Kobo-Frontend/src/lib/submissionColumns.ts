import type { ApiOutletRow } from "@/lib/outletTransform";

export type SubmissionColumnScope = "global" | "project";

export type SubmissionColumnDef = {
  key: string;
  label: string;
  /** When a scope is omitted, falls back to `defaultVisibleDefault`. */
  defaultVisible: boolean | Partial<Record<SubmissionColumnScope, boolean>>;
  scopes: SubmissionColumnScope[];
};

function isColumnDefaultVisible(col: SubmissionColumnDef, scope: SubmissionColumnScope): boolean {
  if (typeof col.defaultVisible === "boolean") {
    return col.defaultVisible;
  }
  return col.defaultVisible[scope] ?? true;
}

export const SUBMISSION_COLUMNS: SubmissionColumnDef[] = [
  { key: "name", label: "Outlet / Facility Name", defaultVisible: true, scopes: ["global", "project"] },
  { key: "branch", label: "Branch", defaultVisible: true, scopes: ["project"] },
  { key: "fieldWorker", label: "Field Worker", defaultVisible: true, scopes: ["global", "project"] },
  { key: "road", label: "Road / Street", defaultVisible: true, scopes: ["global", "project"] },
  { key: "suburb", label: "Area / Subcounty", defaultVisible: true, scopes: ["global", "project"] },
  { key: "ward", label: "Ward", defaultVisible: true, scopes: ["global", "project"] },
  { key: "county", label: "County", defaultVisible: true, scopes: ["global", "project"] },
  { key: "landmark", label: "Nearest Landmark", defaultVisible: true, scopes: ["global", "project"] },
  { key: "region", label: "Region", defaultVisible: false, scopes: ["global", "project"] },
  { key: "lat", label: "Latitude", defaultVisible: false, scopes: ["global", "project"] },
  { key: "lng", label: "Longitude", defaultVisible: false, scopes: ["global", "project"] },
  { key: "type", label: "Outlet Type", defaultVisible: { global: true, project: false }, scopes: ["global", "project"] },
  { key: "owner", label: "Owner Name", defaultVisible: false, scopes: ["global", "project"] },
  { key: "phone", label: "Owner Phone", defaultVisible: false, scopes: ["global", "project"] },
  { key: "accountStatus", label: "Medical Facility Type", defaultVisible: false, scopes: ["global", "project"] },
  { key: "servicedByMedilab", label: "Serviced by Medilab", defaultVisible: false, scopes: ["global", "project"] },
  { key: "physical_location", label: "Physical Location", defaultVisible: false, scopes: ["global", "project"] },
  { key: "photos_count", label: "Photos Count", defaultVisible: false, scopes: ["global", "project"] },
  { key: "gps_accuracy_meters", label: "GPS Accuracy", defaultVisible: false, scopes: ["global", "project"] },
  { key: "reverse_geocoded_address", label: "Full OSM Address", defaultVisible: false, scopes: ["global", "project"] },
  { key: "country", label: "Country", defaultVisible: false, scopes: ["global", "project"] },
  { key: "registration", label: "Registration", defaultVisible: true, scopes: ["global"] },
  { key: "submittedAt", label: "Submitted At", defaultVisible: true, scopes: ["global", "project"] },
];

export function columnsForScope(scope: SubmissionColumnScope): SubmissionColumnDef[] {
  return SUBMISSION_COLUMNS.filter((c) => c.scopes.includes(scope));
}

export function defaultHiddenColumnKeys(scope: SubmissionColumnScope): string[] {
  return columnsForScope(scope)
    .filter((c) => !isColumnDefaultVisible(c, scope))
    .map((c) => c.key);
}

export function hiddenColumnsStorageKey(scope: SubmissionColumnScope, projectId?: number): string {
  if (scope === "project" && projectId !== undefined) {
    return `project-${projectId}-submission-hidden-cols`;
  }
  return "global-submission-hidden-cols";
}

export function loadHiddenColumnKeys(scope: SubmissionColumnScope, projectId?: number): string[] {
  if (typeof window === "undefined") {
    return defaultHiddenColumnKeys(scope);
  }
  const key = hiddenColumnsStorageKey(scope, projectId);
  const saved = localStorage.getItem(key);
  if (!saved) {
    return defaultHiddenColumnKeys(scope);
  }
  try {
    const parsed = JSON.parse(saved) as string[];
    const valid = new Set(columnsForScope(scope).map((c) => c.key));
    return parsed.filter((k) => valid.has(k));
  } catch {
    return defaultHiddenColumnKeys(scope);
  }
}

export function saveHiddenColumnKeys(
  scope: SubmissionColumnScope,
  hidden: string[],
  projectId?: number,
): void {
  const key = hiddenColumnsStorageKey(scope, projectId);
  localStorage.setItem(key, JSON.stringify(hidden));
}

export function visibleColumnsForScope(
  scope: SubmissionColumnScope,
  hiddenKeys: string[],
): SubmissionColumnDef[] {
  const hidden = new Set(hiddenKeys);
  return columnsForScope(scope).filter((c) => !hidden.has(c.key));
}

export function submissionCellValue(row: ApiOutletRow, col: string): string {
  switch (col) {
    case "road":
      return row.road ?? "—";
    case "suburb":
      return row.suburb ?? "—";
    case "ward":
      return row.captured_ward ?? row.ward ?? "—";
    case "county":
      return row.captured_county ?? row.county ?? "—";
    case "landmark":
      return row.raw?.landmark ?? "—";
    case "physical_location":
      return row.raw?.physical_location ?? row.location ?? "—";
    case "photos_count":
      return String(row.photos_count ?? row.photo_urls?.length ?? 0);
    case "lat":
      return row.lat ? String(row.lat) : "—";
    case "lng":
      return row.lng ? String(row.lng) : "—";
    case "registration":
      return row.accountStatus === "Unregistered" ? "Unregistered" : "Registered";
    default:
      return String((row as Record<string, unknown>)[col] ?? "—");
  }
}

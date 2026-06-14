import { getApiBase, type CreatedOutlet } from "../api/client";
import type { SubmittedOutlet } from "../domain/newOutletTypes";

function resolveApiAbsoluteUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = getApiBase().replace(/\/$/, "");
  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

function submittedTimestamp(row: CreatedOutlet): string {
  if (row.submitted_at && row.submitted_at.length > 0) {
    return row.submitted_at;
  }
  const parsed = Date.parse(row.submittedAt);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

export function outletListRowToSubmitted(row: CreatedOutlet, collectorName: string): SubmittedOutlet {
  const raw = row.raw ?? {};
  const photos = (row.photo_urls ?? []).map((uri, i) => ({
    id: `srv-${row.id}-${i}`,
    uri: resolveApiAbsoluteUrl(uri),
  }));
  const locParts = row.location.split(" · ").filter(Boolean);
  const physical =
    typeof raw.physical_location === "string" && raw.physical_location.trim() !== ""
      ? raw.physical_location.trim()
      : locParts[0] ?? row.location;

  const landmarkFromLoc =
    locParts.length > 1 ? locParts.slice(1).join(" · ") : typeof raw.landmark === "string" ? raw.landmark : "";
  const landmark =
    typeof raw.landmark === "string" && raw.landmark.trim() !== ""
      ? raw.landmark.trim()
      : landmarkFromLoc;

  const s = row.status;
  const serverReviewStatus =
    s === "approved" || s === "rejected" || s === "pending" ? s : undefined;

  return {
    collectionProjectId: null,
    collectionProjectName: "",
    branchId: null,
    branchName: "",
    countyId: null,
    countyName: "",
    wardId: row.ward_id ?? null,
    wardName: "",
    questionnaireId: null,
    typeOfAccount: String(raw.type_of_account ?? "PHARMACY"),
    medicalFacilityStatus: String(raw.medical_facility_status ?? "REGISTERED"),
    outletServicedByMed: String(raw.outlet_serviced_by_med ?? "YES"),
    selectedCategory: String(raw.selected_category ?? "RETAIL PHARMACY"),
    facilityName: String(raw.facility_name ?? row.name ?? ""),
    ownerName: row.owner,
    businessPhone: row.phone ?? "",
    alternativePhone: typeof raw.alternative_phone === "string" ? raw.alternative_phone : "",
    email: typeof raw.email === "string" ? raw.email : "",
    physicalLocation: physical,
    landmark,
    gps: `${row.lat}, ${row.lng}`,
    accuracyMeters: 5,
    latitude: row.lat,
    longitude: row.lng,
    gpsCapturedAt: submittedTimestamp(row),
    capturedPlaceName: "",
    reverseGeocodedAddress: "",
    capturedAddress: "",
    road: "",
    suburb: "",
    capturedWard: "",
    capturedCounty: "",
    region: "",
    country: "",
    photos,
    remarks: typeof raw.remarks === "string" ? raw.remarks : "",
    id: row.id,
    submittedAt: submittedTimestamp(row),
    submittedBy: row.fieldWorker || collectorName,
    syncStatus: "synced",
    serverReviewStatus,
  };
}

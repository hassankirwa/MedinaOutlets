import type { OutletPoint, OutletType } from "@/components/maps/outlet-map-data";

export type ApiOutletRow = {
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
  lat: number;
  lng: number;
  status?: string;
  /** Resolved URLs (storage or HTTPS); local API may include picsum placeholders when no photos */
  photo_urls?: string[];
  raw?: {
    facility_name?: string;
    outlet_type?: string;
    type_of_account?: string;
    medical_facility_status?: string;
    outlet_serviced_by_med?: string;
    selected_category?: string;
    landmark?: string;
    remarks?: string;
  };
};

const KNOWN_TYPES: OutletType[] = [
  "Pharmacy",
  "Clinic / Dispensary",
  "Agrovet",
  "Shop",
  "Hospital",
];

export function normalizeOutletType(type: string): OutletType {
  const t = type.trim();
  if ((KNOWN_TYPES as string[]).includes(t)) {
    return t as OutletType;
  }
  return "Shop";
}

const PALETTE = ["#2563eb", "#ec4899", "#22c55e", "#f59e0b", "#8b5cf6"] as const;

export type CategoryBarBlock = {
  title: string;
  bars: [string, number, string][];
};

function titleCaseCategory(s: string): string {
  return s
    .toLowerCase()
    .split(/[\s_/]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function categoryBlocksFromOutletRows(rows: ApiOutletRow[]): CategoryBarBlock[] {
  const keys = ["Pharmacy", "Clinic / Dispensary", "Agrovet", "Hospital"] as const;
  const groups: Record<(typeof keys)[number], Record<string, number>> = {
    Pharmacy: {},
    "Clinic / Dispensary": {},
    Agrovet: {},
    Hospital: {},
  };
  for (const row of rows) {
    const t = normalizeOutletType(row.type);
    if (!(t in groups)) {
      continue;
    }
    const rawCat = row.raw?.selected_category?.trim();
    const label = rawCat && rawCat.length > 0 ? titleCaseCategory(rawCat) : "General";
    const bucket = groups[t as keyof typeof groups];
    bucket[label] = (bucket[label] ?? 0) + 1;
  }
  const sectionTitles: Record<(typeof keys)[number], string> = {
    Pharmacy: "Pharmacy Categories",
    "Clinic / Dispensary": "Clinic / Dispensary Categories",
    Agrovet: "Agrovet Categories",
    Hospital: "Hospital Categories",
  };
  return keys.map((key) => {
    const entries = Object.entries(groups[key])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const bars: [string, number, string][] = entries.map(([name, value], i) => [
      name,
      value,
      PALETTE[i % PALETTE.length],
    ]);
    if (bars.length === 0) {
      bars.push(["No data yet", 0, "#cbd5e1"]);
    }
    return { title: sectionTitles[key], bars };
  });
}

export function apiOutletToPoint(row: ApiOutletRow): OutletPoint {
  return {
    id: row.id,
    name: row.name,
    type: normalizeOutletType(row.type),
    owner: row.owner,
    phone: row.phone,
    location: row.location,
    fieldWorker: row.fieldWorker,
    accountStatus: row.accountStatus === "Unregistered" ? "Unregistered" : "Registered",
    servicedByMedilab: row.servicedByMedilab === "No" ? "No" : "Yes",
    submittedAt: row.submittedAt,
    lat: row.lat,
    lng: row.lng,
    status: row.status,
  };
}

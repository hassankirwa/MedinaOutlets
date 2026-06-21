export type OutletType = "Pharmacy" | "Clinic / Dispensary" | "Agrovet" | "Shop" | "Hospital";

export type OutletPoint = {
  id: string;
  name: string;
  type: OutletType;
  owner: string;
  phone: string;
  location: string;
  fieldWorker: string;
  accountStatus: "Registered" | "Unregistered";
  servicedByMedilab: "Yes" | "No";
  submittedAt: string;
  lat: number;
  lng: number;
  /** API review status: pending | approved | rejected */
  status?: string;
};

export const TYPE_COLORS: Record<OutletType, string> = {
  Pharmacy: "#3b82f6",
  "Clinic / Dispensary": "#8b5cf6",
  Agrovet: "#f59e0b",
  Shop: "#22c55e",
  Hospital: "#ef4444",
};

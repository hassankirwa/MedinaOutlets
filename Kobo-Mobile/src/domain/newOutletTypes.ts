export type OutletPhoto = { id: string; uri: string };

export type NewOutletDraft = {
  /** County project the collector is working under (field collectors only). */
  collectionProjectId: string | null;
  collectionProjectName: string;
  /** Ward assigned on that project; sent as `ward_id` when creating the outlet. */
  wardId: number | null;
  wardName: string;
  typeOfAccount: string;
  medicalFacilityStatus: string;
  outletServicedByMed: string;
  selectedCategory: string;
  facilityName: string;
  ownerName: string;
  businessPhone: string;
  email: string;
  physicalLocation: string;
  landmark: string;
  gps: string;
  accuracyMeters: number;
  latitude: number;
  longitude: number;
  photos: OutletPhoto[];
  remarks: string;
};

export type SubmittedOutlet = NewOutletDraft & {
  id: string;
  submittedAt: string;
  submittedBy: string;
  syncStatus?: "synced" | "pending";
  /** Present when this row was loaded from the API (outlet review workflow). */
  serverReviewStatus?: "pending" | "approved" | "rejected";
};

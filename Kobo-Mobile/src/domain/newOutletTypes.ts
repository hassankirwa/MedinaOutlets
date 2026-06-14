export type OutletPhoto = {
  id: string;
  uri: string;
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
};

export type NewOutletDraft = {
  collectionProjectId: string | null;
  collectionProjectName: string;
  branchId: number | null;
  branchName: string;
  countyId: number | null;
  countyName: string;
  wardId: number | null;
  wardName: string;
  questionnaireId: number | null;
  typeOfAccount: string;
  medicalFacilityStatus: string;
  outletServicedByMed: string;
  selectedCategory: string;
  facilityName: string;
  ownerName: string;
  businessPhone: string;
  alternativePhone: string;
  email: string;
  physicalLocation: string;
  landmark: string;
  gps: string;
  accuracyMeters: number;
  latitude: number;
  longitude: number;
  gpsCapturedAt: string;
  capturedPlaceName: string;
  reverseGeocodedAddress: string;
  capturedAddress: string;
  road: string;
  suburb: string;
  capturedWard: string;
  capturedCounty: string;
  region: string;
  country: string;
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

import type { NewOutletDraft } from "./newOutletTypes";

export function createDefaultNewOutletDraft(): NewOutletDraft {
  return {
    collectionProjectId: null,
    collectionProjectName: "",
    wardId: null,
    wardName: "",
    typeOfAccount: "PHARMACY",
    medicalFacilityStatus: "REGISTERED",
    outletServicedByMed: "YES",
    selectedCategory: "RETAIL PHARMACY",
    facilityName: "",
    ownerName: "",
    businessPhone: "",
    email: "",
    physicalLocation: "Mogondo Center (Diani)",
    landmark: "Mogondo Highway",
    gps: "-4.32921, 39.68125",
    accuracyMeters: 5,
    latitude: -4.32921,
    longitude: 39.68125,
    photos: [],
    remarks: "",
  };
}

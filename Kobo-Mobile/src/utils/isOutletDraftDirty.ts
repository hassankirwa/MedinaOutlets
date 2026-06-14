import { createDefaultNewOutletDraft } from "../domain/newOutletDefaults";
import type { NewOutletDraft } from "../domain/newOutletTypes";

/** True when the user has meaningful progress that should not be lost without confirmation. */
export function isOutletDraftDirty(draft: NewOutletDraft): boolean {
  const def = createDefaultNewOutletDraft();
  if (draft.collectionProjectId != null || draft.wardId != null) {
    return true;
  }
  if (
    draft.facilityName.trim() ||
    draft.ownerName.trim() ||
    draft.businessPhone.trim() ||
    draft.alternativePhone.trim() ||
    draft.email.trim() ||
    draft.remarks.trim()
  ) {
    return true;
  }
  if (draft.gpsCapturedAt.trim()) {
    return true;
  }
  if (draft.photos.length > 0) {
    return true;
  }
  if (draft.typeOfAccount !== def.typeOfAccount) {
    return true;
  }
  if (draft.medicalFacilityStatus !== def.medicalFacilityStatus) {
    return true;
  }
  if (draft.outletServicedByMed !== def.outletServicedByMed) {
    return true;
  }
  if (draft.selectedCategory !== def.selectedCategory) {
    return true;
  }
  if (draft.physicalLocation.trim() !== def.physicalLocation.trim()) {
    return true;
  }
  if (draft.landmark.trim() !== def.landmark.trim()) {
    return true;
  }
  if (draft.gps.trim() !== def.gps.trim()) {
    return true;
  }
  if (draft.accuracyMeters !== def.accuracyMeters) {
    return true;
  }
  if (draft.latitude !== def.latitude || draft.longitude !== def.longitude) {
    return true;
  }
  return false;
}

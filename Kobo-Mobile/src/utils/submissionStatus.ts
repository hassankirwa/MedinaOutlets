import type { SubmittedOutlet } from "../domain/newOutletTypes";

export type SubmissionStatusVariant = "pending_sync" | "submitted" | "approved" | "rejected";

export function getSubmissionStatus(item: SubmittedOutlet): {
  label: string;
  variant: SubmissionStatusVariant;
} {
  if (item.syncStatus === "pending") {
    return { label: "Waiting to sync", variant: "pending_sync" };
  }

  switch (item.serverReviewStatus) {
    case "approved":
      return { label: "Approved", variant: "approved" };
    case "rejected":
      return { label: "Rejected", variant: "rejected" };
    case "pending":
    default:
      return { label: "Submitted", variant: "submitted" };
  }
}

export function getSubmissionStatusLabel(item: SubmittedOutlet): string {
  return getSubmissionStatus(item).label;
}

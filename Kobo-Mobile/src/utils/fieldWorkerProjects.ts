import type { AuthUser, MyWardAssignmentProject } from "../api/client";

/** Matches backend: outlets allowed only for active or paused projects assigned to the field worker. */
export function fieldCollectorCanAddOutlets(projects: MyWardAssignmentProject[]): boolean {
  return projects.some((p) => p.status === "active" || p.status === "paused");
}

export const FIELD_COLLECTOR_ADD_OUTLET_BLOCKED_MESSAGE =
  "You need an active or paused project assigned to you before adding outlets. Ask your admin to assign you to a project.";

/** While assignments are loading, allow UI actions; server still enforces rules. */
export function computeAddOutletEnabled(
  user: AuthUser | null,
  assignments: MyWardAssignmentProject[],
  assignmentsLoaded: boolean,
): boolean {
  if (user?.role?.slug !== "field_collector") {
    return true;
  }
  if (!assignmentsLoaded) {
    return true;
  }
  return fieldCollectorCanAddOutlets(assignments);
}

const STATUS_ORDER: Record<string, number> = {
  active: 0,
  paused: 1,
  draft: 2,
  completed: 3,
};

export function sortAssignmentsForDisplay(projects: MyWardAssignmentProject[]): MyWardAssignmentProject[] {
  return [...projects].sort((a, b) => {
    const da = STATUS_ORDER[a.status] ?? 99;
    const db = STATUS_ORDER[b.status] ?? 99;
    if (da !== db) return da - db;
    return `${a.branch ?? ""} ${a.name}`.localeCompare(`${b.branch ?? ""} ${b.name}`);
  });
}

export function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "draft":
      return "Draft";
    case "completed":
      return "Complete";
    default:
      return status;
  }
}

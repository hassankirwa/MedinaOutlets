export type ReportFilters = {
  branch_id: string;
  project_id: string;
  from: string;
  to: string;
};

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  branch_id: "",
  project_id: "",
  from: "",
  to: "",
};

export function filtersToSearchParams(filters: ReportFilters): URLSearchParams {
  const q = new URLSearchParams();
  if (filters.branch_id) q.set("branch_id", filters.branch_id);
  if (filters.project_id) q.set("project_id", filters.project_id);
  if (filters.from) q.set("from", filters.from);
  if (filters.to) q.set("to", filters.to);
  return q;
}

export function filtersFromSearchParams(params: URLSearchParams): ReportFilters {
  return {
    branch_id: params.get("branch_id") ?? "",
    project_id: params.get("project_id") ?? "",
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
  };
}

export function filtersToApiParams(filters: ReportFilters): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.branch_id) out.branch_id = filters.branch_id;
  if (filters.project_id) out.project_id = filters.project_id;
  if (filters.from) out.from = filters.from;
  if (filters.to) out.to = filters.to;
  return out;
}

export function buildReportViewHref(type: string, filters: ReportFilters): string {
  const q = filtersToSearchParams(filters);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return `/admin/reports/${encodeURIComponent(type)}${suffix}`;
}

export function buildReportsListHref(filters: ReportFilters): string {
  const q = filtersToSearchParams(filters);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return `/admin/reports${suffix}`;
}

export function filterSummary(
  filters: ReportFilters,
  branches: Array<{ id: string; name: string }>,
  projects: Array<{ id: string; name: string }>,
): string {
  const parts: string[] = [];
  if (filters.branch_id) {
    parts.push(`Branch: ${branches.find((b) => b.id === filters.branch_id)?.name ?? filters.branch_id}`);
  }
  if (filters.project_id) {
    parts.push(`Project: ${projects.find((p) => p.id === filters.project_id)?.name ?? filters.project_id}`);
  }
  if (filters.from) parts.push(`From: ${filters.from}`);
  if (filters.to) parts.push(`To: ${filters.to}`);
  return parts.length > 0 ? parts.join(" · ") : "All submissions in your workspace";
}

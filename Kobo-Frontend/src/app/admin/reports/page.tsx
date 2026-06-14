"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Loader2, Menu } from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import { fetchBranches, fetchProjects, fetchReports, type ReportTypeRow } from "@/lib/api";
import {
  buildReportViewHref,
  buildReportsListHref,
  filtersFromSearchParams,
  type ReportFilters,
} from "@/lib/reportFilters";

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = React.useState<ReportTypeRow[]>([]);
  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [filters, setFilters] = React.useState<ReportFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const [loadingCatalog, setLoadingCatalog] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFilters(filtersFromSearchParams(searchParams));
  }, [searchParams]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingCatalog(true);
      try {
        const [reportRes, branchRes, projectRes] = await Promise.all([
          fetchReports(),
          fetchBranches(),
          fetchProjects(),
        ]);
        if (!cancelled) {
          setReports(reportRes.reports);
          setBranches(branchRes.branches);
          setProjects(
            (projectRes.projects ?? []).map((p) => ({
              id: p.id,
              name: p.name,
            })),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load reports.");
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const syncFiltersToUrl = (next: ReportFilters) => {
    setFilters(next);
    router.replace(buildReportsListHref(next));
  };

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={toggleSidebar} className="rounded-lg border p-2 lg:hidden">
                <Menu size={18} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                <p className="text-sm text-slate-500">Choose filters, then open a report to review before exporting</p>
              </div>
            </div>
            <NotificationBell />
          </header>

          <div className="mb-4 flex flex-wrap gap-2">
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={filters.branch_id}
              onChange={(e) => syncFiltersToUrl({ ...filters, branch_id: e.target.value })}
            >
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={filters.project_id}
              onChange={(e) => syncFiltersToUrl({ ...filters, project_id: e.target.value })}
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-lg border px-3 py-2 text-sm"
              value={filters.from}
              onChange={(e) => syncFiltersToUrl({ ...filters, from: e.target.value })}
              aria-label="From date"
            />
            <input
              type="date"
              className="rounded-lg border px-3 py-2 text-sm"
              value={filters.to}
              onChange={(e) => syncFiltersToUrl({ ...filters, to: e.target.value })}
              aria-label="To date"
            />
          </div>

          {error ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Report</th>
                  <th className="px-4 py-3 text-left">Formats</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingCatalog ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                      <Loader2 size={20} className="mx-auto mb-2 animate-spin text-emerald-600" />
                      Loading reports…
                    </td>
                  </tr>
                ) : (
                  reports.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{row.name}</p>
                        {row.description ? (
                          <p className="mt-0.5 text-xs text-slate-500">{row.description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.format}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={buildReportViewHref(row.type, filters)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          <Eye size={13} />
                          View report
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}

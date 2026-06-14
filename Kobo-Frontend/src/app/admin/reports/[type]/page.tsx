"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Menu } from "lucide-react";
import { AdminShell } from "../../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  downloadReportExport,
  fetchBranches,
  fetchProjects,
  generateReport,
  type GeneratedReport,
} from "@/lib/api";
import {
  buildReportsListHref,
  filterSummary,
  filtersFromSearchParams,
  filtersToApiParams,
} from "@/lib/reportFilters";

export default function ReportViewPage() {
  const params = useParams<{ type: string }>();
  const searchParams = useSearchParams();
  const reportType = decodeURIComponent(params?.type ?? "");
  const filters = React.useMemo(
    () => filtersFromSearchParams(searchParams),
    [searchParams],
  );

  const [report, setReport] = React.useState<GeneratedReport | null>(null);
  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  const [projects, setProjects] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loadState, setLoadState] = React.useState<"loading" | "ok" | "error">("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState<"csv" | "xlsx" | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!reportType) {
      setLoadState("error");
      setLoadError("Missing report type.");
      return;
    }

    let cancelled = false;
    void (async () => {
      setLoadState("loading");
      setLoadError(null);
      setReport(null);
      try {
        const [data, branchRes, projectRes] = await Promise.all([
          generateReport({ type: reportType, ...filtersToApiParams(filters) }),
          fetchBranches(),
          fetchProjects(),
        ]);
        if (!cancelled) {
          setReport(data);
          setBranches(branchRes.branches);
          setProjects(
            (projectRes.projects ?? []).map((p) => ({
              id: p.id,
              name: p.name,
            })),
          );
          setLoadState("ok");
        }
      } catch (e) {
        if (!cancelled) {
          setLoadState("error");
          setLoadError(e instanceof Error ? e.message : "Failed to load report.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reportType, filters.branch_id, filters.project_id, filters.from, filters.to]);

  const exportReport = async (format: "csv" | "xlsx") => {
    if (!report) return;
    setExporting(format);
    setExportError(null);
    try {
      await downloadReportExport(
        { type: report.type, format, ...filtersToApiParams(filters) },
        `${report.type}.${format}`,
      );
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  const totalValue = report?.rows.reduce(
    (sum, row) => sum + (typeof row.value === "number" ? row.value : 0),
    0,
  );

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={toggleSidebar}
                className="mt-1 rounded-lg border p-2 lg:hidden"
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <Link
                  href={buildReportsListHref(filters)}
                  className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  <ArrowLeft size={14} />
                  Back to reports
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">
                  {loadState === "loading" ? "Loading report…" : report?.title ?? "Report"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {filterSummary(filters, branches, projects)}
                </p>
                {report ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Generated {new Date(report.generated_at).toLocaleString()} ·{" "}
                    {report.rows.length.toLocaleString()} row{report.rows.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {report && loadState === "ok" ? (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    disabled={exporting !== null || report.rows.length === 0}
                    onClick={() => void exportReport("csv")}
                  >
                    {exporting === "csv" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    Export CSV
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={exporting !== null || report.rows.length === 0}
                    onClick={() => void exportReport("xlsx")}
                  >
                    {exporting === "xlsx" ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    Export XLSX
                  </button>
                </>
              ) : null}
              <NotificationBell />
            </div>
          </header>

          {loadError ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {loadError}
            </p>
          ) : null}

          {exportError ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {exportError}
            </p>
          ) : null}

          {loadState === "loading" ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="mt-3 text-sm text-slate-500">Loading report data…</p>
            </div>
          ) : null}

          {loadState === "ok" && report ? (
            <section className="rounded-2xl border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-[480px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">{report.columns[0]}</th>
                      <th className="px-4 py-3 text-right font-medium">{report.columns[1]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-12 text-center text-slate-500">
                          No data for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      report.rows.map((row, index) => (
                        <tr
                          key={`${row.label}-${index}`}
                          className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                        >
                          <td className="border-t border-slate-100 px-4 py-3 text-slate-800">
                            {row.label}
                          </td>
                          <td className="border-t border-slate-100 px-4 py-3 text-right font-medium text-slate-900">
                            {typeof row.value === "number" ? row.value.toLocaleString() : row.value}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {report.rows.length > 0 ? (
                    <tfoot className="bg-slate-50 font-semibold text-slate-900">
                      <tr>
                        <td className="border-t border-slate-200 px-4 py-3">Total</td>
                        <td className="border-t border-slate-200 px-4 py-3 text-right">
                          {totalValue?.toLocaleString() ?? "—"}
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </AdminShell>
  );
}

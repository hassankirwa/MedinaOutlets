"use client";

import * as React from "react";
import { fetchProjectAnalytics } from "@/lib/api";

export function ProjectReportsTab({ projectId }: { projectId: number }) {
  const [analytics, setAnalytics] = React.useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchProjectAnalytics(projectId);
        if (!cancelled) setAnalytics(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) return <p className="text-sm text-slate-500">Loading reports…</p>;
  if (!analytics) return <p className="text-sm text-slate-500">No analytics available.</p>;

  const byDay = (analytics.submissions_by_day as Record<string, number>) ?? {};
  const byWorker = (analytics.submissions_by_worker as Record<string, number>) ?? {};
  const byCounty = (analytics.submissions_by_county as Record<string, number>) ?? {};
  const byWard = (analytics.submissions_by_ward as Record<string, number>) ?? {};
  const approval = (analytics.approval_breakdown as Record<string, number>) ?? {};

  const renderTable = (title: string, data: Record<string, number>) => (
    <div className="rounded-xl border p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-800">{title}</h3>
      <table className="w-full text-sm">
        <tbody>
          {Object.entries(data).length === 0 ? (
            <tr><td className="py-2 text-slate-500">No data</td></tr>
          ) : (
            Object.entries(data).map(([label, count]) => (
              <tr key={label} className="border-t border-slate-100">
                <td className="py-2 text-slate-700">{label}</td>
                <td className="py-2 text-right font-medium">{count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-blue-50 p-4">
          <p className="text-xs text-slate-500">GPS completion</p>
          <p className="text-2xl font-bold text-slate-900">{String(analytics.gps_completion_rate ?? 0)}%</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-4">
          <p className="text-xs text-slate-500">Photo completion</p>
          <p className="text-2xl font-bold text-slate-900">{String(analytics.photo_completion_rate ?? 0)}%</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {renderTable("Daily submissions trend", byDay)}
        {renderTable("Submissions by field worker", byWorker)}
        {renderTable("Submissions by captured county/district", byCounty)}
        {renderTable("Submissions by captured ward/area", byWard)}
        <div className="rounded-xl border p-4 md:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Approval status</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Approved: {approval.approved ?? 0}</span>
            <span>Pending: {approval.pending ?? 0}</span>
            <span>Rejected: {approval.rejected ?? 0}</span>
            <span>Needs correction: {approval.needs_correction ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

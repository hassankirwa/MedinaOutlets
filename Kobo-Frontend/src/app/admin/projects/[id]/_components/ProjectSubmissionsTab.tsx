"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { fetchProjectOutlets } from "@/lib/api";
import type { ApiOutletRow } from "@/lib/outletTransform";
import {
  submissionCellValue,
  visibleColumnsForScope,
} from "@/lib/submissionColumns";
import {
  SubmissionColumnPicker,
  SubmissionColumnsButton,
  useSubmissionHiddenColumns,
} from "@/components/submissions/SubmissionColumnPicker";

export function ProjectSubmissionsTab({ projectId }: { projectId: number }) {
  const [rows, setRows] = React.useState<ApiOutletRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const { hiddenKeys, showPicker, setShowPicker, toggleColumn, resetColumns } =
    useSubmissionHiddenColumns("project", projectId);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchProjectOutlets(projectId, { search: search || undefined });
        const data = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, search]);

  const visibleCols = visibleColumnsForScope("project", hiddenKeys);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="rounded-lg border px-3 py-2 text-sm"
          placeholder="Search outlet / owner / phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SubmissionColumnsButton showPicker={showPicker} onToggle={() => setShowPicker((v) => !v)} />
      </div>
      {showPicker && (
        <SubmissionColumnPicker
          scope="project"
          hiddenKeys={hiddenKeys}
          onToggle={toggleColumn}
          onReset={resetColumns}
        />
      )}
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              {visibleCols.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left uppercase">
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleCols.length + 1} className="p-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length + 1} className="p-6 text-center text-slate-500">
                  No submissions
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  {visibleCols.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 py-2 max-w-[220px] truncate"
                      title={submissionCellValue(row, col.key)}
                    >
                      {submissionCellValue(row, col.key)}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/projects/${projectId}/submissions/${row.id}`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-700"
                      >
                        <Eye size={12} /> View
                      </Link>
                      <Link
                        href={`/admin/projects/${projectId}/submissions/${row.id}?edit=1`}
                        className="inline-flex items-center gap-1 text-xs text-slate-600"
                      >
                        <Pencil size={12} /> Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Calendar,
  ChevronDown,
  FileDown,
  FileSpreadsheet,
  Menu,
} from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";

const reportRows = [
  ["Monthly Outlet Performance", "PDF", "May 31, 2026", "Auto"],
  ["Field Worker Productivity", "XLSX", "May 31, 2026", "Manual"],
  ["Data Quality Summary", "CSV", "May 30, 2026", "Auto"],
  ["County Coverage Snapshot", "PDF", "May 29, 2026", "Manual"],
];

export default function ReportsPage() {
  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
                onClick={toggleSidebar}
                aria-label="Open menu"
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="text-[22px] font-bold text-slate-900">Reports</h1>
                <p className="text-[12px] text-slate-500">
                  Generate and download operational reports
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="shrink-0">
                <NotificationBell />
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                <FileSpreadsheet size={15} />
                Export XLSX
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700">
                <FileDown size={15} />
                Export CSV
              </button>
            </div>
          </header>

          <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                <Calendar size={16} />
                May 1, 2026 - May 31, 2026
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                Report Type
                <ChevronDown size={14} className="text-slate-400" />
              </button>
            </div>

            <div className="-mx-1 overflow-x-auto rounded-xl border border-slate-100 sm:mx-0">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Report Name</th>
                    <th className="px-4 py-3 text-left font-medium">Format</th>
                    <th className="px-4 py-3 text-left font-medium">Generated At</th>
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row) => (
                    <tr key={row[0]} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-800">{row[0]}</td>
                      <td className="px-4 py-3 text-slate-600">{row[1]}</td>
                      <td className="px-4 py-3 text-slate-600">{row[2]}</td>
                      <td className="px-4 py-3 text-slate-600">{row[3]}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                            <FileSpreadsheet size={13} />
                            XLSX
                          </button>
                          <button className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100">
                            <FileDown size={13} />
                            CSV
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}

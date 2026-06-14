"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Calendar,
  ChevronDown,
  Eye,
  FileText,
  FileSpreadsheet,
  FileDown,
  Filter,
  Hospital,
  Leaf,
  Loader2,
  Menu,
  Pencil,
  Phone,
  Search,
  ShoppingBag,
  Stethoscope,
  Upload,
} from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  bulkDeleteOutlets,
  downloadOutletSpreadsheetBlob,
  fetchOutletsApi,
  importOutletsSpreadsheet,
  canReviewOutletSubmissions,
  readUserProfile,
} from "@/lib/api";
import { normalizeOutletType, type ApiOutletRow } from "@/lib/outletTransform";
import { resolveOutletMediaUrl } from "@/lib/mediaUrl";
import {
  submissionCellValue,
  visibleColumnsForScope,
} from "@/lib/submissionColumns";
import {
  SubmissionColumnPicker,
  SubmissionColumnsButton,
  useSubmissionHiddenColumns,
} from "@/components/submissions/SubmissionColumnPicker";

function submissionThumb(api: ApiOutletRow): string {
  const thumbRaw =
    api.photo_urls?.[0] ??
    `https://ui-avatars.com/api/?size=160&background=f1f5f9&color=334155&name=${encodeURIComponent(api.name)}`;
  return resolveOutletMediaUrl(thumbRaw);
}

function StatCard({
  icon: Icon,
  iconClass,
  title,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  iconClass: string;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[11px] text-slate-500">{title}</p>
          <p className="mt-1 text-[31px] leading-none font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function FacilityAccountTypeBadge({ type }: { type: string }) {
  const norm = normalizeOutletType(type);
  const map = {
    Pharmacy: {
      icon: BadgeCheck,
      cls: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    "Clinic / Dispensary": {
      icon: Stethoscope,
      cls: "bg-violet-50 text-violet-700 border-violet-100",
    },
    Agrovet: { icon: Leaf, cls: "bg-amber-50 text-amber-700 border-amber-100" },
    Hospital: { icon: Hospital, cls: "bg-blue-50 text-blue-700 border-blue-100" },
    Shop: { icon: ShoppingBag, cls: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  } as const;
  const entry = map[norm as keyof typeof map] ?? {
    icon: ShoppingBag,
    cls: "bg-slate-50 text-slate-700 border-slate-100",
  };
  const Icon = entry.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${entry.cls}`}>
      <Icon size={12} />
      {norm}
    </span>
  );
}

function RegistrationBadge({ registration }: { registration: "Registered" | "Unregistered" }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-[10px] font-medium ${
        registration === "Registered"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-rose-50 text-rose-700"
      }`}
    >
      {registration}
    </span>
  );
}

export default function SubmissionsPage() {
  const [rows, setRows] = React.useState<ApiOutletRow[]>([]);
  const { hiddenKeys, showPicker, setShowPicker, toggleColumn, resetColumns } =
    useSubmissionHiddenColumns("global");
  const visibleCols = visibleColumnsForScope("global", hiddenKeys);
  const [loadState, setLoadState] = React.useState<"loading" | "ok" | "error">("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = React.useState<"" | "delete">("");
  const [bulkBusy, setBulkBusy] = React.useState(false);
  const [importMenuOpen, setImportMenuOpen] = React.useState(false);
  const [exportMenuOpen, setExportMenuOpen] = React.useState(false);
  const [importBusy, setImportBusy] = React.useState(false);
  const headerSelectRef = React.useRef<HTMLInputElement>(null);
  const headerActionsRef = React.useRef<HTMLDivElement>(null);
  const csvImportInputRef = React.useRef<HTMLInputElement>(null);
  const xlsxImportInputRef = React.useRef<HTMLInputElement>(null);

  const profile = readUserProfile();
  const canReview = canReviewOutletSubmissions(profile?.role?.slug);
  const canImport = canReview;

  const loadSubmissions = React.useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const raw = await fetchOutletsApi();
      setRows(raw);
      setLoadState("ok");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load submissions");
      setLoadState("error");
    }
  }, []);

  React.useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!headerActionsRef.current?.contains(e.target as Node)) {
        setImportMenuOpen(false);
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!q) {
        return true;
      }
      return (
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        r.fieldWorker.toLowerCase().includes(q) ||
        normalizeOutletType(r.type).toLowerCase().includes(q) ||
        (r.captured_ward ?? r.ward ?? "").toLowerCase().includes(q) ||
        (r.captured_county ?? r.county ?? "").toLowerCase().includes(q) ||
        (r.suburb ?? "").toLowerCase().includes(q) ||
        (r.raw?.landmark ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  React.useEffect(() => {
    setSelectedIds(new Set());
    setBulkAction("");
  }, [search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someFilteredSelected = filtered.some((r) => selectedIds.has(r.id));

  React.useEffect(() => {
    const el = headerSelectRef.current;
    if (el) {
      el.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const toggleRowSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  async function handleBulkApply() {
    if (!canReview || !bulkAction || selectedIds.size === 0) {
      return;
    }

    if (bulkAction === "delete") {
      const count = selectedIds.size;
      const confirmed = window.confirm(
        `Delete ${count} selected submission${count === 1 ? "" : "s"}? This cannot be undone.`,
      );
      if (!confirmed) {
        return;
      }
    }

    setBulkBusy(true);
    try {
      const ids = [...selectedIds];
      await bulkDeleteOutlets(ids);
      const deleted = new Set(ids);
      setRows((prev) => prev.filter((row) => !deleted.has(row.id)));
      setSelectedIds(new Set());
      setBulkAction("");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  }

  const stats = React.useMemo(() => ({ total: rows.length }), [rows]);

  async function handleImportFile(file: File) {
    setImportBusy(true);
    setImportMenuOpen(false);
    try {
      const result = await importOutletsSpreadsheet(file);
      await loadSubmissions();
      let msg = `Imported ${result.imported} row(s).`;
      if (result.errors.length > 0) {
        msg += `\n\n${result.errors.length} row(s) failed.`;
        const detail = result.errors
          .slice(0, 8)
          .map((e) => `Row ${e.row}: ${e.messages.join("; ")}`)
          .join("\n");
        msg += `\n\n${detail}`;
        if (result.errors.length > 8) {
          msg += "\n…";
        }
      }
      window.alert(msg);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImportBusy(false);
    }
  }

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
                <h1 className="text-[22px] font-bold text-slate-900">Submissions</h1>
                <p className="text-[12px] text-slate-500">View and manage all outlet census submissions</p>
              </div>
            </div>

            <div ref={headerActionsRef} className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="shrink-0">
                <NotificationBell />
              </div>
              {canImport ? (
                <>
                  <input
                    ref={csvImportInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) {
                        void handleImportFile(f);
                      }
                    }}
                  />
                  <input
                    ref={xlsxImportInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) {
                        void handleImportFile(f);
                      }
                    }}
                  />
                  <div className="relative">
                    <button
                      type="button"
                      disabled={importBusy}
                      onClick={() => {
                        setExportMenuOpen(false);
                        setImportMenuOpen((o) => !o);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Upload size={15} />
                      Import
                      <ChevronDown size={14} className="opacity-60" />
                    </button>
                    {importMenuOpen ? (
                      <div className="absolute right-0 z-30 mt-1 min-w-[240px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            void downloadOutletSpreadsheetBlob(
                              "/api/outlets/spreadsheet/template?format=csv",
                              "outlet-import-template.csv",
                            );
                            setImportMenuOpen(false);
                          }}
                        >
                          Download template (CSV)
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            void downloadOutletSpreadsheetBlob(
                              "/api/outlets/spreadsheet/template?format=xlsx",
                              "outlet-import-template.xlsx",
                            );
                            setImportMenuOpen(false);
                          }}
                        >
                          Download template (XLSX)
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            csvImportInputRef.current?.click();
                            setImportMenuOpen(false);
                          }}
                        >
                          Import CSV…
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            xlsxImportInputRef.current?.click();
                            setImportMenuOpen(false);
                          }}
                        >
                          Import XLSX…
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setImportMenuOpen(false);
                    setExportMenuOpen((o) => !o);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  <FileDown size={15} />
                  Export
                  <ChevronDown size={14} className="opacity-90" />
                </button>
                {exportMenuOpen ? (
                  <div className="absolute right-0 z-30 mt-1 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        void downloadOutletSpreadsheetBlob(
                          "/api/outlets/spreadsheet/export?format=csv",
                          "outlets-export.csv",
                        );
                        setExportMenuOpen(false);
                      }}
                    >
                      <FileSpreadsheet size={14} className="text-slate-400" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        void downloadOutletSpreadsheetBlob(
                          "/api/outlets/spreadsheet/export?format=xlsx",
                          "outlets-export.xlsx",
                        );
                        setExportMenuOpen(false);
                      }}
                    >
                      <FileSpreadsheet size={14} className="text-slate-400" />
                      Export XLSX
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <section className="mt-6">
            <StatCard
              icon={FileText}
              iconClass="bg-emerald-50 text-emerald-600"
              title="Total Submissions"
              value={loadState === "loading" ? "—" : stats.total.toLocaleString()}
              subtitle="Loaded from API"
            />
          </section>

          {loadError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          )}

          {!canReview && loadState === "ok" && rows.length > 0 && (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              You can view and edit submissions. Bulk delete requires Company Admin, QA Officer, or Super Admin.
            </p>
          )}

          <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="lg:col-span-5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full text-sm outline-none"
                  placeholder="Search facility name, owner, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="lg:col-span-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                <Calendar size={16} /> Date range (coming soon)
              </button>
              <button
                type="button"
                className="lg:col-span-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                <Filter size={16} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <SubmissionColumnsButton
                showPicker={showPicker}
                onToggle={() => setShowPicker((v) => !v)}
              />
            </div>
            {showPicker && (
              <SubmissionColumnPicker
                scope="global"
                hiddenKeys={hiddenKeys}
                onToggle={toggleColumn}
                onReset={resetColumns}
              />
            )}

            {canReview && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-600">
                  {selectedIds.size} selected
                  {filtered.length > 0 ? ` · ${filtered.length} shown` : ""}
                </span>
                <label className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span className="sr-only">Bulk action</span>
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-800 outline-none"
                    value={bulkAction}
                    onChange={(e) => setBulkAction((e.target.value || "") as "" | "delete")}
                    disabled={bulkBusy}
                  >
                    <option value="">Bulk actions…</option>
                    <option value="delete">Delete selected</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={bulkBusy || selectedIds.size === 0 || !bulkAction}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 bg-red-600 hover:bg-red-700`}
                  onClick={() => void handleBulkApply()}
                >
                  {bulkBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                  Apply
                </button>
              </div>
            )}

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-[1280px] w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {canReview ? (
                      <th className="w-10 border-b border-slate-100 px-2 py-3 text-left font-medium">
                        <input
                          ref={headerSelectRef}
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={allFilteredSelected}
                          onChange={toggleAllFiltered}
                          disabled={filtered.length === 0 || bulkBusy}
                          title="Select all rows in this list"
                          aria-label="Select all rows in this list"
                        />
                      </th>
                    ) : null}
                    {visibleCols.map((col) => (
                      <th
                        key={col.key}
                        className="border-b border-slate-100 px-3 py-3 text-left font-medium whitespace-nowrap"
                      >
                        {col.label.toUpperCase()}
                      </th>
                    ))}
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium whitespace-nowrap">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadState === "loading" && (
                    <tr>
                      <td
                        colSpan={(canReview ? 1 : 0) + visibleCols.length + 1}
                        className="px-3 py-10 text-center text-sm text-slate-500"
                      >
                        Loading submissions…
                      </td>
                    </tr>
                  )}
                  {loadState === "ok" && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={(canReview ? 1 : 0) + visibleCols.length + 1}
                        className="px-3 py-10 text-center text-sm text-slate-500"
                      >
                        No submissions match your filters.
                      </td>
                    </tr>
                  )}
                  {loadState === "ok" &&
                    filtered.map((row, rowIndex) => (
                      <tr
                        key={row.id}
                        className={rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                      >
                          {canReview ? (
                            <td className="border-b border-slate-100 px-2 py-2.5 align-top">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-slate-300"
                                checked={selectedIds.has(row.id)}
                                onChange={() => toggleRowSelected(row.id)}
                                disabled={bulkBusy}
                                aria-label={`Select ${row.name}`}
                              />
                            </td>
                          ) : null}
                          {visibleCols.map((col) => (
                            <td
                              key={col.key}
                              className="border-b border-slate-100 px-3 py-2.5 align-top max-w-[220px]"
                            >
                              {col.key === "name" ? (
                                <div className="flex items-start gap-2.5">
                                  <img
                                    src={submissionThumb(row)}
                                    alt={row.name}
                                    className="h-10 w-10 rounded-md object-cover shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-[12px] font-semibold text-slate-800 truncate">
                                      {row.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500">Owner: {row.owner}</div>
                                    <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500">
                                      <Phone size={10} />
                                      {row.phone || "—"}
                                    </div>
                                  </div>
                                </div>
                              ) : col.key === "type" ? (
                                <FacilityAccountTypeBadge type={row.type} />
                              ) : col.key === "fieldWorker" ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={`https://ui-avatars.com/api/?size=80&name=${encodeURIComponent(row.fieldWorker || "?")}`}
                                    alt={row.fieldWorker}
                                    className="h-7 w-7 rounded-full object-cover shrink-0"
                                  />
                                  <span className="text-[11px] text-slate-700">{row.fieldWorker || "—"}</span>
                                </div>
                              ) : col.key === "registration" ? (
                                <RegistrationBadge
                                  registration={
                                    row.accountStatus === "Unregistered"
                                      ? "Unregistered"
                                      : "Registered"
                                  }
                                />
                              ) : (
                                <div
                                  className="text-[11px] text-slate-700 truncate"
                                  title={submissionCellValue(row, col.key)}
                                >
                                  {submissionCellValue(row, col.key)}
                                </div>
                              )}
                            </td>
                          ))}
                          <td className="border-b border-slate-100 px-3 py-2.5 align-top">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/admin/submissions/${row.id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                                title="View submission"
                              >
                                <Eye size={12} /> View
                              </Link>
                              <Link
                                href={`/admin/submissions/${row.id}?edit=1`}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"
                                title="Edit submission"
                              >
                                <Pencil size={12} /> Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-col gap-2 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of {filtered.length} (filtered)
              </p>
              <p>API limit: 500 outlets</p>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}

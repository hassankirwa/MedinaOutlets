"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Menu, Save } from "lucide-react";
import { AdminShell } from "../../dashboard/_components/AdminShell";
import {
  fetchCounties,
  fetchFieldWorkers,
  fetchProjectDetail,
  updateProject,
  type CountyApiRow,
  type FieldWorkerRowApi,
  type ProjectWriteStatus,
} from "@/lib/api";

function displayStatusToWrite(s: string): ProjectWriteStatus {
  const m: Record<string, ProjectWriteStatus> = {
    Draft: "draft",
    Active: "active",
    Paused: "paused",
    Completed: "completed",
  };
  return m[s] ?? "draft";
}

export default function EditProjectPage() {
  const [isSaving, setIsSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const params = useParams<{ id: string }>();
  const rawId = params?.id ?? "";
  const projectId = React.useMemo(() => {
    const n = Number(rawId);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [rawId]);
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [countyId, setCountyId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [status, setStatus] = React.useState<ProjectWriteStatus>("draft");
  const [counties, setCounties] = React.useState<CountyApiRow[]>([]);
  const [workers, setWorkers] = React.useState<FieldWorkerRowApi[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [fwSearch, setFwSearch] = React.useState("");
  const [initialLoad, setInitialLoad] = React.useState(true);

  React.useEffect(() => {
    if (!Number.isFinite(projectId)) {
      setLoadError("Invalid project.");
      setInitialLoad(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const [detail, c, w] = await Promise.all([
          fetchProjectDetail(projectId),
          fetchCounties(),
          fetchFieldWorkers(),
        ]);
        if (cancelled) {
          return;
        }
        setCounties(c);
        setWorkers(w.workers);
        const p = detail.project;
        setName(p.name);
        setDescription(p.description ?? "");
        setCountyId(String(p.county_id));
        setStartDate(p.start_date ?? "");
        setEndDate(p.end_date ?? "");
        setStatus(displayStatusToWrite(p.status));
        setSelected(new Set(detail.assigned_workers.map((x) => x.id)));
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load project");
        }
      } finally {
        if (!cancelled) {
          setInitialLoad(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const filteredWorkers = React.useMemo(() => {
    const q = fwSearch.trim().toLowerCase();
    if (!q) {
      return workers;
    }
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q),
    );
  }, [workers, fwSearch]);

  const toggleWorker = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!Number.isFinite(projectId)) {
      return;
    }
    setSaveError(null);
    const cid = Number(countyId);
    if (!name.trim() || !Number.isFinite(cid)) {
      setSaveError("Name and county are required.");
      return;
    }
    setIsSaving(true);
    try {
      await updateProject(projectId, {
        name: name.trim(),
        description: description.trim() || null,
        county_id: cid,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        field_worker_ids: [...selected].map((id) => Number(id)),
      });
      router.push(`/admin/projects/${rawId}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700"
                aria-label="Open menu"
                onClick={toggleSidebar}
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <Link
                  href={`/admin/projects/${rawId}`}
                  className="inline-flex items-center gap-1 text-sm text-emerald-700"
                >
                  <ArrowLeft size={14} />
                  Back to Project Details
                </Link>
                <h1 className="mt-2 text-[28px] font-bold text-slate-900">Edit Project</h1>
                <p className="text-[13px] text-slate-500">Project ID: {rawId || "—"}</p>
              </div>
            </div>
          </header>

          {loadError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          )}

          {initialLoad ? (
            <p className="mt-8 text-sm text-slate-500">Loading project…</p>
          ) : (
            <form
              onSubmit={(e) => void handleSave(e)}
              className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {saveError && (
                <div className="mx-4 mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-8">
                  {saveError}
                </div>
              )}
              <div className="space-y-8 p-4 sm:p-8">
                <section className="space-y-5">
                  <h3 className="border-l-4 border-emerald-600 pl-3 text-xl font-medium text-slate-900 sm:text-2xl">
                    Project Information
                  </h3>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-sm text-slate-600">Project Name</span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-sm text-slate-600">Description</span>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-slate-600">County</span>
                      <select
                        value={countyId}
                        onChange={(e) => setCountyId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      >
                        <option value="">Select county</option>
                        {counties.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-slate-600">Status</span>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as ProjectWriteStatus)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-slate-600">Start Date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-sm text-slate-600">End Date</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </label>
                  </div>
                </section>

                <section className="space-y-4 border-t border-slate-200 pt-6">
                  <h3 className="border-l-4 border-emerald-600 pl-3 text-xl font-medium text-slate-900 sm:text-2xl">
                    Assign Field Workers
                  </h3>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
                    <input
                      className="w-full text-sm outline-none"
                      placeholder="Search field workers..."
                      value={fwSearch}
                      onChange={(e) => setFwSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-100 p-3">
                    {filteredWorkers.map((w) => (
                      <label
                        key={w.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2 py-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={selected.has(w.id)}
                          onChange={() => toggleWorker(w.id)}
                        />
                        <span className="text-sm text-slate-800">{w.name}</span>
                        <span className="text-xs text-slate-400">{w.email}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 px-4 py-4 sm:px-8 sm:py-5">
                <Link
                  href={`/admin/projects/${rawId}`}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Save size={15} />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </AdminShell>
  );
}

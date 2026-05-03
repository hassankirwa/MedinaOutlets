"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Menu, Pencil, Save, Users } from "lucide-react";
import { AdminShell } from "../../dashboard/_components/AdminShell";
import {
  fetchFieldWorkers,
  fetchProjectDetail,
  syncProjectWardAssignments,
  type AssignedWorkerApi,
  type FieldWorkerRowApi,
  type ProjectDetailPayload,
  type ProjectWardRowApi,
} from "@/lib/api";

function formatLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRange(isoStart: string, isoEnd: string): { line: string; days: string } {
  const start = new Date(isoStart);
  const end = new Date(isoEnd);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const line = `${start.toLocaleDateString("en-GB", opts)} - ${end.toLocaleDateString("en-GB", opts)}`;
  const dayMs = 86400000;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
  return { line, days: `${days} day${days === 1 ? "" : "s"}` };
}

function statusPillClass(status: string): string {
  if (status === "Active") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "Completed") {
    return "bg-blue-50 text-blue-700";
  }
  if (status === "Paused") {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const rawId = params?.id ?? "";
  const projectId = React.useMemo(() => {
    const n = Number(rawId);
    return Number.isFinite(n) && n > 0 ? n : NaN;
  }, [rawId]);

  const [detail, setDetail] = React.useState<ProjectDetailPayload | null>(null);
  const [loadState, setLoadState] = React.useState<"loading" | "ok" | "error">("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [workers, setWorkers] = React.useState<FieldWorkerRowApi[]>([]);
  const [wardPick, setWardPick] = React.useState<Record<number, string>>({});
  const [savingWards, setSavingWards] = React.useState(false);
  const [wardSaveErr, setWardSaveErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(projectId)) {
      setLoadState("error");
      setLoadError("Invalid project link. Open a project from the Projects list.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadState("loading");
      setLoadError(null);
      try {
        const data = await fetchProjectDetail(projectId);
        if (cancelled) {
          return;
        }
        setDetail(data);
        setLoadState("ok");
      } catch (e) {
        if (cancelled) {
          return;
        }
        setLoadError(e instanceof Error ? e.message : "Failed to load project");
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const w = await fetchFieldWorkers();
        if (!cancelled) {
          setWorkers(w.workers);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const wards = detail?.wards;
    if (!wards?.length) {
      setWardPick({});
      return;
    }
    const next: Record<number, string> = {};
    for (const w of wards) {
      next[w.id] = w.assigned_user_id != null ? String(w.assigned_user_id) : "";
    }
    setWardPick(next);
  }, [detail]);

  const projectIdLabel = rawId || "—";
  const project = detail?.project;

  const period =
    project ? formatRange(project.period_start, project.period_end) : { line: "—", days: "" };

  const assignedWorkersList: AssignedWorkerApi[] = detail?.assigned_workers ?? [];
  const wards: ProjectWardRowApi[] = detail?.wards ?? [];

  async function saveWardAssignments() {
    if (!Number.isFinite(projectId)) {
      return;
    }
    const assignments = Object.entries(wardPick)
      .filter(([, uid]) => uid !== "")
      .map(([wid, uid]) => ({
        ward_id: Number(wid),
        user_id: Number(uid),
      }));
    setSavingWards(true);
    setWardSaveErr(null);
    try {
      const out = await syncProjectWardAssignments(projectId, assignments);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              wards: out.wards,
              assigned_workers: out.assigned_workers,
              project: {
                ...prev.project,
                field_workers: out.assigned_workers.length,
              },
            }
          : prev,
      );
    } catch (e) {
      setWardSaveErr(e instanceof Error ? e.message : "Could not save ward assignments");
    } finally {
      setSavingWards(false);
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
                aria-label="Open menu"
                onClick={toggleSidebar}
              >
                <Menu size={18} />
              </button>
              <div className="min-w-0">
                <Link href="/admin/projects" className="inline-flex items-center gap-1 text-sm text-emerald-700">
                  <ArrowLeft size={14} />
                  Back to Projects
                </Link>
                <h1 className="mt-2 text-[28px] font-bold text-slate-900">
                  {loadState === "loading" ? "Loading…" : project?.name ?? "Project"}
                </h1>
                <p className="text-[13px] text-slate-500">Project ID: {projectIdLabel}</p>
              </div>
            </div>

            <Link
              href={`/admin/projects/edit/${projectIdLabel}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Pencil size={15} />
              Edit Project
            </Link>
          </header>

          {loadError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          )}

          {project && (
            <>
              <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-500">Project Period</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{period.line}</p>
                  <p className="text-xs text-slate-400">{period.days}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-500">County</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{project.county}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-500">Lead contact</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {assignedWorkersList[0]?.name ?? "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-xs text-slate-500">Status</p>
                  <p
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusPillClass(project.status)}`}
                  >
                    {project.status}
                  </p>
                </div>
              </section>

              <section className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
                  <h3 className="text-lg font-semibold text-slate-900">Project Details</h3>
                  <dl className="mt-4 grid grid-cols-1 gap-y-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Project ID</dt>
                      <dd className="font-semibold text-slate-900">{projectIdLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">County</dt>
                      <dd className="font-semibold text-slate-900">{project.county}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Description</dt>
                      <dd className="font-medium text-slate-800">
                        {project.description?.trim() ? project.description : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Planned start</dt>
                      <dd className="font-semibold text-slate-900">
                        {project.start_date ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Planned end</dt>
                      <dd className="font-semibold text-slate-900">
                        {project.end_date ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">First outlet captured</dt>
                      <dd className="font-semibold text-slate-900">{formatLong(project.period_start)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Latest outlet captured</dt>
                      <dd className="font-semibold text-slate-900">{formatLong(project.period_end)}</dd>
                    </div>
                  </dl>
                  <p className="mt-5 text-sm leading-6 text-slate-600">
                    Outlet counts and approval progress are aggregated for{" "}
                    <span className="font-medium">{project.county}</span> County under your organization.
                    Assigned field workers are managed explicitly on the edit screen.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Progress</h3>
                    <p className="mt-3 text-sm text-slate-600">Approval progress</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, project.progress)}%` }}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500">Outlets</p>
                        <p className="font-semibold text-slate-900">{project.outlets_collected}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Approved share</p>
                        <p className="font-semibold text-slate-900">{project.progress}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Quick Info</h3>
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Assigned collectors</span>
                        <span className="font-semibold">{assignedWorkersList.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Outlet contributors</span>
                        <span className="font-semibold">
                          {detail?.stats?.outlet_contributors ?? "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Total outlets</span>
                        <span className="font-semibold">{project.outlets_collected}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">Ward assignments</h3>
                  <button
                    type="button"
                    onClick={() => void saveWardAssignments()}
                    disabled={savingWards || wards.length === 0 || workers.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingWards ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save ward map
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Each ward in <span className="font-medium">{project.county}</span> can be assigned to one collector.
                  This drives which wards appear for each user in the mobile app.
                </p>
                {wardSaveErr && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {wardSaveErr}
                  </div>
                )}
                {wards.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No wards are configured for this county yet. Add wards in the database or pick another county when
                    creating the project.
                  </p>
                ) : workers.length === 0 ? (
                  <p className="mt-4 text-sm text-rose-700">No field collectors in this workspace.</p>
                ) : (
                  <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-100">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Ward</th>
                          <th className="px-3 py-2 font-medium">Collector</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wards.map((ward) => (
                          <tr key={ward.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 text-slate-800">{ward.name}</td>
                            <td className="px-3 py-2">
                              <select
                                className="w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                                value={wardPick[ward.id] ?? ""}
                                onChange={(e) =>
                                  setWardPick((prev) => ({ ...prev, [ward.id]: e.target.value }))
                                }
                              >
                                <option value="">— Unassigned —</option>
                                {workers.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">Assigned Field Workers</h3>
                  <Link
                    href="/admin/field-workers"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-slate-50"
                  >
                    View All Field Workers
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {assignedWorkersList.map((worker) => (
                    <div
                      key={worker.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
                    >
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{worker.name}</p>
                        <p className="text-xs text-slate-500">{worker.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {assignedWorkersList.length === 0 && (
                  <p className="mt-3 text-sm text-slate-500">
                    No collectors assigned yet. Use Edit Project to assign field workers.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </AdminShell>
  );
}

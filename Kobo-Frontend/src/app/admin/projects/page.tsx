"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Eye,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  createProject,
  deleteProject,
  fetchCounties,
  fetchCountyDetail,
  fetchFieldWorkers,
  fetchProjects,
  type CountyApiRow,
  type FieldWorkerRowApi,
  type ProjectRowApi,
  type ProjectWriteStatus,
  type WardApiRow,
} from "@/lib/api";

type ProjectStatus = "Active" | "Completed" | "Paused" | "Draft";

type Project = {
  id: string;
  name: string;
  county: string;
  status: ProjectStatus;
  period: string;
  days: string;
  outletsCollected: number;
  fieldWorkers: number;
  progress: number;
};

function mapApiProject(p: ProjectRowApi): Project {
  const start = new Date(p.period_start);
  const end = new Date(p.period_end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const period = `${start.toLocaleDateString("en-GB", opts)} - ${end.toLocaleDateString("en-GB", opts)}`;
  const dayMs = 86400000;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
  return {
    id: p.id,
    name: p.name,
    county: p.county,
    status: p.status,
    period,
    days: `${days} day${days === 1 ? "" : "s"}`,
    outletsCollected: p.outlets_collected,
    fieldWorkers: p.field_workers,
    progress: p.progress,
  };
}

const statusPill = (status: ProjectStatus) =>
  status === "Active"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Completed"
      ? "bg-blue-50 text-blue-700"
      : status === "Paused"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";

function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [countyId, setCountyId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [status, setStatus] = React.useState<ProjectWriteStatus>("draft");
  const [counties, setCounties] = React.useState<CountyApiRow[]>([]);
  const [workers, setWorkers] = React.useState<FieldWorkerRowApi[]>([]);
  const [countyWards, setCountyWards] = React.useState<WardApiRow[]>([]);
  /** ward id → selected collector user id, or "" for unassigned */
  const [wardPick, setWardPick] = React.useState<Record<number, string>>({});
  const [wardsLoading, setWardsLoading] = React.useState(false);
  const [fwSearch, setFwSearch] = React.useState("");
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr(null);
      try {
        const [c, w] = await Promise.all([fetchCounties(), fetchFieldWorkers()]);
        if (cancelled) {
          return;
        }
        setCounties(c);
        setWorkers(w.workers);
      } catch (e) {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : "Failed to load form data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setCountyId("");
      setStartDate("");
      setEndDate("");
      setStatus("draft");
      setCountyWards([]);
      setWardPick({});
      setFwSearch("");
      setSubmitErr(null);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !countyId) {
      setCountyWards([]);
      setWardPick({});
      return;
    }
    let cancelled = false;
    const cid = Number(countyId);
    if (!Number.isFinite(cid)) {
      return;
    }
    void (async () => {
      setWardsLoading(true);
      try {
        const { wards } = await fetchCountyDetail(cid);
        if (cancelled) {
          return;
        }
        setCountyWards(wards);
        setWardPick({});
      } catch {
        if (!cancelled) {
          setCountyWards([]);
        }
      } finally {
        if (!cancelled) {
          setWardsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, countyId]);

  const visibleWards = React.useMemo(() => {
    const q = fwSearch.trim().toLowerCase();
    if (!q) {
      return countyWards;
    }
    return countyWards.filter((w) => w.name.toLowerCase().includes(q));
  }, [countyWards, fwSearch]);

  const setWardWorker = (wardId: number, userId: string) => {
    setWardPick((prev) => ({ ...prev, [wardId]: userId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErr(null);
    const cid = Number(countyId);
    if (!name.trim() || !Number.isFinite(cid)) {
      setSubmitErr("Project name and county are required.");
      return;
    }
    const wardAssignments = Object.entries(wardPick)
      .filter(([, uid]) => uid !== "")
      .map(([wid, uid]) => ({
        ward_id: Number(wid),
        user_id: Number(uid),
      }));

    setSubmitting(true);
    try {
      await createProject({
        name: name.trim(),
        county_id: cid,
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        ...(wardAssignments.length > 0 ? { ward_assignments: wardAssignments } : {}),
      });
      await onCreated();
      onClose();
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-y-contain bg-slate-900/40 p-3 py-6 sm:p-4 sm:py-8">
      <form
        onSubmit={handleSubmit}
        className="my-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
          <h2 className="text-xl font-semibold text-slate-900 sm:text-3xl">Create Project</h2>
          <button
            type="button"
            onClick={onClose}
            className="self-end rounded-lg p-1 text-slate-500 hover:bg-slate-100 sm:self-auto"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-8 p-4 sm:p-8">
          {loadErr && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadErr}
            </div>
          )}
          {submitErr && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {submitErr}
            </div>
          )}

          <section className="space-y-5">
            <h3 className="border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-900">
              Project Information
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Project name"
                disabled={loading}
              />
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-slate-500">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Project description"
                  rows={3}
                  disabled={loading}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">County</span>
                <select
                  value={countyId}
                  onChange={(e) => setCountyId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  disabled={loading}
                >
                  <option value="">Select county</option>
                  {counties.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectWriteStatus)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  disabled={loading}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  disabled={loading}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500">End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  disabled={loading}
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-200 pt-6">
            <h3 className="border-l-4 border-emerald-600 pl-3 text-2xl font-medium text-slate-900">
              Assign wards to collectors
            </h3>
            <p className="text-sm text-slate-600">
              Select a county first. Each ward in that county can be assigned to one field worker (many wards per
              worker). Collectors will see these wards in the mobile app.
            </p>
            {!countyId ? (
              <p className="text-sm text-amber-700">Choose a county above to load wards.</p>
            ) : wardsLoading ? (
              <p className="text-sm text-slate-500">Loading wards…</p>
            ) : countyWards.length === 0 ? (
              <p className="text-sm text-slate-500">No wards found for this county in the database.</p>
            ) : workers.length === 0 ? (
              <p className="text-sm text-rose-700">Add field collectors before assigning wards.</p>
            ) : (
              <div className="max-h-72 overflow-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Ward</th>
                      <th className="px-3 py-2 font-medium">Assigned collector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleWards.map((ward) => (
                      <tr key={ward.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-800">{ward.name}</td>
                        <td className="px-3 py-2">
                          <select
                            className="w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                            value={wardPick[ward.id] ?? ""}
                            onChange={(e) => setWardWorker(ward.id, e.target.value)}
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
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input
                className="w-full text-sm outline-none"
                placeholder="Filter ward names…"
                value={fwSearch}
                onChange={(e) => setFwSearch(e.target.value)}
                disabled={loading || countyWards.length === 0}
              />
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-8 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || loading}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Creating…" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteProjectModal({
  project,
  onClose,
  onDeleted,
}: {
  project: Project | null;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}) {
  const [deleting, setDeleting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  if (!project) {
    return null;
  }

  const handleDelete = async () => {
    setErr(null);
    setDeleting(true);
    try {
      await deleteProject(project.id);
      await onDeleted();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-2xl font-semibold text-slate-900">Delete Project</h3>
        <p className="mt-3 text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold">{project.name}</span>?
          This action cannot be undone.
        </p>
        {err && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Project | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [summary, setSummary] = React.useState({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    paused_projects: 0,
    draft_projects: 0,
    total_field_workers: 0,
  });
  const [loadState, setLoadState] = React.useState<"loading" | "ok" | "error">("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const loadProjects = React.useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const data = await fetchProjects();
      setSummary({
        ...data.summary,
        draft_projects: data.summary.draft_projects ?? 0,
      });
      setProjects(data.projects.map(mapApiProject));
      setLoadState("ok");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load projects");
      setLoadState("error");
    }
  }, []);

  React.useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return projects;
    }
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.county.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q),
    );
  }, [projects, search]);

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
                <h1 className="text-[22px] font-bold text-slate-900">Projects</h1>
                <p className="text-[12px] text-slate-500">Manage all outlet census projects</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="shrink-0">
                <NotificationBell />
              </div>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus size={15} />
                Create Project
              </button>
            </div>
          </header>

          {loadError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          )}

          <section className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-6">
            {[
              ["Total Projects", String(summary.total_projects), "Workspace projects"],
              ["Draft Projects", String(summary.draft_projects), "Not launched yet"],
              ["Active Projects", String(summary.active_projects), "In progress"],
              ["Completed Projects", String(summary.completed_projects), "Marked complete"],
              ["Paused Projects", String(summary.paused_projects), "On hold"],
              ["Total Field Workers", String(summary.total_field_workers), "Collectors in workspace"],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {loadState === "loading" ? "—" : value}
                </p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
            ))}
          </section>

          <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
              <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full text-sm outline-none"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {["All Status", "All Counties", "All Project Managers"].map((p) => (
                <button key={p} className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-600">
                  {p}
                </button>
              ))}
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">
                <Calendar size={16} /> May 1, 2026 - May 31, 2026
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium">PROJECT NAME</th>
                    <th className="px-3 py-3 text-left font-medium">COUNTY</th>
                    <th className="px-3 py-3 text-left font-medium">STATUS</th>
                    <th className="px-3 py-3 text-left font-medium">PERIOD</th>
                    <th className="px-3 py-3 text-left font-medium">OUTLETS COLLECTED</th>
                    <th className="px-3 py-3 text-left font-medium">FIELD WORKERS</th>
                    <th className="px-3 py-3 text-left font-medium">PROGRESS</th>
                    <th className="px-3 py-3 text-left font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loadState === "loading" && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                        Loading projects…
                      </td>
                    </tr>
                  )}
                  {loadState === "ok" && filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                        No projects match your filters. Create a project or adjust search.
                      </td>
                    </tr>
                  )}
                  {loadState === "ok" &&
                    filtered.map((project) => (
                    <tr key={project.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-800">{project.name}</td>
                      <td className="px-3 py-3 text-slate-600">{project.county}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPill(project.status)}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <div>{project.period}</div>
                        <div className="text-xs text-slate-400">{project.days}</div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{project.outletsCollected.toLocaleString()}</td>
                      <td className="px-3 py-3 font-semibold text-slate-700">{project.fieldWorkers}</td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-semibold text-slate-700">{project.progress}%</div>
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-100">
                          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${project.progress}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/projects/${project.id}`} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
                            <Eye size={14} />
                          </Link>
                          <Link
                            href={`/admin/projects/edit/${project.id}`}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                          >
                            <Pencil size={14} />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(project)}
                            className="rounded-lg border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

      <CreateProjectModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadProjects}
      />
      <DeleteProjectModal
        project={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={loadProjects}
      />
        </>
      )}
    </AdminShell>
  );
}

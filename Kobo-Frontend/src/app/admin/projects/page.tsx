"use client";

import * as React from "react";
import Link from "next/link";
import {
  Eye,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  deleteProject,
  fetchBranches,
  fetchProjects,
  type BranchApiRow,
  type ProjectRowApi,
} from "@/lib/api";

type ProjectStatus = "Active" | "Completed" | "Paused" | "Draft";

type Project = {
  id: string;
  name: string;
  branch: string;
  status: ProjectStatus;
  period: string;
  days: string;
  outletsCollected: number;
  fieldWorkers: number;
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
    branch: p.branch ?? "",
    status: p.status,
    period,
    days: `${days} day${days === 1 ? "" : "s"}`,
    outletsCollected: p.outlets_collected,
    fieldWorkers: p.field_workers,
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
  const [branchFilter, setBranchFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [branches, setBranches] = React.useState<BranchApiRow[]>([]);

  React.useEffect(() => {
    void fetchBranches().then((d) => setBranches(d.branches));
  }, []);

  const loadProjects = React.useCallback(async () => {
    setLoadState("loading");
    setLoadError(null);
    try {
      const data = await fetchProjects({
        search: search || undefined,
        branch_id: branchFilter ? Number(branchFilter) : undefined,
        status: statusFilter || undefined,
      });
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
  }, [search, branchFilter, statusFilter]);

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
        p.branch.toLowerCase().includes(q) ||
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
              <Link
                href="/admin/projects/new"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus size={15} />
                Create Project
              </Link>
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
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-left font-medium">PROJECT NAME</th>
                    <th className="px-3 py-3 text-left font-medium">BRANCH</th>
                    <th className="px-3 py-3 text-left font-medium">STATUS</th>
                    <th className="px-3 py-3 text-left font-medium">PERIOD</th>
                    <th className="px-3 py-3 text-left font-medium">SUBMISSIONS</th>
                    <th className="px-3 py-3 text-left font-medium">FIELD WORKERS</th>
                    <th className="px-3 py-3 text-left font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loadState === "loading" && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                        Loading projects…
                      </td>
                    </tr>
                  )}
                  {loadState === "ok" && filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                        No projects match your filters. Create a project or adjust search.
                      </td>
                    </tr>
                  )}
                  {loadState === "ok" &&
                    filtered.map((project) => (
                    <tr key={project.id} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-800">{project.name}</td>
                      <td className="px-3 py-3 text-slate-600">{project.branch || "—"}</td>
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
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/projects/${project.id}`} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
                            <Eye size={14} />
                          </Link>
                          <Link
                            href={`/admin/projects/${project.id}?tab=settings`}
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

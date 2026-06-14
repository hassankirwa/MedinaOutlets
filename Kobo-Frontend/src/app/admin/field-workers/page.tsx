"use client";

import * as React from "react";
import {
  CheckCircle2,
  Eye,
  Filter,
  Loader2,
  Menu,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserX,
  Users,
  X,
} from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  createFieldWorker,
  deactivateFieldWorker,
  fetchCompaniesList,
  fetchBranches,
  fetchCounties,
  fetchFieldWorkers,
  readUserProfile,
  updateFieldWorker,
  type CompanyListRow,
  type CountyApiRow,
  type FieldWorkerRowApi,
} from "@/lib/api";

type WorkerStatus = "Active" | "Inactive" | "Suspended";

type FieldWorker = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  county: string;
  branch: string;
  projects: number;
  outletsCollected: number;
  thisMonth: number;
  status: WorkerStatus;
  avatar: string;
};

function mapApiWorker(w: FieldWorkerRowApi): FieldWorker {
  return {
    id: w.id,
    name: w.name,
    role: w.role,
    phone: w.phone,
    email: w.email,
    county: w.county,
    branch: w.branch ?? w.assigned_branches?.[0] ?? "—",
    projects: w.projects,
    outletsCollected: w.outlets_collected,
    thisMonth: w.this_month,
    status: w.status,
    avatar: w.avatar,
  };
}

function statusClasses(status: WorkerStatus) {
  if (status === "Active") return "bg-emerald-50 text-emerald-700";
  if (status === "Inactive") return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  iconClass,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[11px] text-slate-500">{title}</p>
          <p className="mt-1 text-[30px] leading-none font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

export default function FieldWorkersPage() {
  const [workers, setWorkers] = React.useState<FieldWorker[]>([]);
  const [summary, setSummary] = React.useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    projects_assigned: 0,
  });
  const [loadState, setLoadState] = React.useState<"loading" | "ok" | "error">("loading");
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<FieldWorker | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<FieldWorker | null>(null);
  const [detailsTarget, setDetailsTarget] = React.useState<FieldWorker | null>(null);

  const [counties, setCounties] = React.useState<CountyApiRow[]>([]);
  const [companies, setCompanies] = React.useState<CompanyListRow[]>([]);
  const [lookupLoading, setLookupLoading] = React.useState(false);

  const [addName, setAddName] = React.useState("");
  const [addEmail, setAddEmail] = React.useState("");
  const [addPhone, setAddPhone] = React.useState("");
  const [addCountyId, setAddCountyId] = React.useState("");
  const [addBranchIds, setAddBranchIds] = React.useState<number[]>([]);
  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  const [addCompanyId, setAddCompanyId] = React.useState("");
  const [addSubmitting, setAddSubmitting] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);

  const profile = readUserProfile();
  const isSuperAdmin = profile?.role?.slug === "super_admin";

  const reloadWorkers = React.useCallback(async () => {
    const data = await fetchFieldWorkers();
    setSummary(data.summary);
    setWorkers(data.workers.map(mapApiWorker));
    setLoadState("ok");
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadState("loading");
      setLoadError(null);
      try {
        await reloadWorkers();
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load field workers");
          setLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadWorkers]);

  React.useEffect(() => {
    if (!isAddOpen && !editTarget) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLookupLoading(true);
      try {
        const [c, co, br] = await Promise.all([
          fetchCounties(),
          isSuperAdmin ? fetchCompaniesList() : Promise.resolve([] as CompanyListRow[]),
          fetchBranches(),
        ]);
        if (cancelled) {
          return;
        }
        setBranches(br.branches);
        setCounties(c);
        setCompanies(co);
      } catch {
        if (!cancelled) {
          setCounties([]);
          setCompanies([]);
        }
      } finally {
        if (!cancelled) {
          setLookupLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAddOpen, editTarget, isSuperAdmin]);

  React.useEffect(() => {
    if (!isAddOpen) {
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddCountyId("");
      setAddCompanyId("");
      setAddError(null);
    }
  }, [isAddOpen]);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    if (isSuperAdmin && !addCompanyId) {
      setAddError("Select the company this field worker belongs to.");
      return;
    }
    setAddSubmitting(true);
    try {
      const out = await createFieldWorker({
        name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim(),
        county_id: addCountyId ? Number(addCountyId) : null,
        branch_ids: addBranchIds,
        ...(isSuperAdmin ? { company_id: Number(addCompanyId) } : {}),
      });
      await reloadWorkers();
      setIsAddOpen(false);
      window.alert(out.message);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add field worker");
    } finally {
      setAddSubmitting(false);
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
                <h1 className="text-[22px] font-bold text-slate-900">Field Workers</h1>
                <p className="text-[12px] text-slate-500">
                  Manage all field data collectors and their performance
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="shrink-0">
                <NotificationBell />
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus size={15} />
                Add Field Worker
              </button>
            </div>
          </header>

          {loadError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {loadError}
            </div>
          )}

          <section className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={Users}
              title="Total Field Workers"
              value={loadState === "loading" ? "—" : String(summary.total)}
              subtitle="Collectors in workspace"
              iconClass="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              icon={UserCheck}
              title="Active Workers"
              value={loadState === "loading" ? "—" : String(summary.active)}
              subtitle="Currently active"
              iconClass="bg-blue-50 text-blue-600"
            />
            <StatCard
              icon={UserMinus}
              title="Inactive Workers"
              value={loadState === "loading" ? "—" : String(summary.inactive)}
              subtitle="Not active"
              iconClass="bg-amber-50 text-amber-600"
            />
            <StatCard
              icon={UserX}
              title="Suspended"
              value={loadState === "loading" ? "—" : String(summary.suspended)}
              subtitle="Temporarily suspended"
              iconClass="bg-rose-50 text-rose-600"
            />
            <StatCard
              icon={CheckCircle2}
              title="Projects Assigned"
              value={loadState === "loading" ? "—" : String(summary.projects_assigned)}
              subtitle="County assignments (sum)"
              iconClass="bg-violet-50 text-violet-600"
            />
          </section>

          <section className="mt-5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 lg:col-span-3">
                <Search size={16} className="text-slate-400" />
                <input
                  className="w-full text-sm outline-none"
                  placeholder="Search field worker name, phone, email..."
                />
              </div>
              {["All Projects", "All Counties", "All Status", "All Supervisors"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 lg:col-span-2"
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 lg:col-span-1"
              >
                <Filter size={15} />
                Filters
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-[1100px] w-full text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="w-8 border-b border-slate-100 px-2 py-3 text-left">
                      <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300" readOnly />
                    </th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">FIELD WORKER</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">PHONE</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">EMAIL</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">BRANCH</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">COUNTY</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">PROJECTS</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">OUTLETS COLLECTED</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">THIS MONTH</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">STATUS</th>
                    <th className="border-b border-slate-100 px-3 py-3 text-left font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loadState === "loading" && (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">
                        Loading field workers…
                      </td>
                    </tr>
                  )}
                  {loadState === "ok" && workers.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">
                        No field collectors found for this workspace.
                      </td>
                    </tr>
                  )}
                  {loadState === "ok" &&
                    workers.map((worker, idx) => (
                      <tr
                        key={worker.id}
                        onClick={() => setDetailsTarget(worker)}
                        className={[
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                          "cursor-pointer hover:bg-emerald-50/40",
                        ].join(" ")}
                      >
                        <td className="border-b border-slate-100 px-2 py-3 align-top">
                          <input type="checkbox" className="mt-1 h-3.5 w-3.5 rounded border-slate-300" readOnly />
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <img src={worker.avatar} alt={worker.name} className="h-8 w-8 rounded-full object-cover" />
                            <div>
                              <div className="text-[12px] font-semibold text-slate-800">{worker.name}</div>
                              <div className="text-[10px] text-slate-500">{worker.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] text-slate-700">
                          <span className="inline-flex items-center gap-1">
                            <Phone size={11} className="text-emerald-600" />
                            {worker.phone}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] text-slate-700">{worker.email}</td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] text-slate-700">{worker.branch}</td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] text-slate-700">{worker.county}</td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] font-semibold text-slate-800">
                          {worker.projects}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] font-semibold text-slate-800">
                          {worker.outletsCollected}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 text-[11px] font-semibold text-slate-800">
                          {worker.thisMonth}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5">
                          <span className={`rounded-md px-2 py-1 text-[10px] font-medium ${statusClasses(worker.status)}`}>
                            {worker.status}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDetailsTarget(worker);
                              }}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setEditTarget(worker);
                              }}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteTarget(worker);
                              }}
                              className="rounded-md border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50"
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

          {isAddOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-8">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">Add Field Worker</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-[12px] text-emerald-900">
                  No password is stored here. After you save, the worker receives an email with a link to choose their
                  own password for the mobile app (same flow as “Forgot password”).
                </p>
                <form onSubmit={(e) => void handleAddSubmit(e)} className="space-y-4">
                  {isSuperAdmin && (
                    <label className="block space-y-1">
                      <span className="text-[12px] font-medium text-slate-700">Company</span>
                      <select
                        required
                        value={addCompanyId}
                        onChange={(e) => setAddCompanyId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        disabled={lookupLoading}
                      >
                        <option value="">Select company</option>
                        {companies.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="block space-y-1 md:col-span-2">
                      <span className="text-[12px] font-medium text-slate-700">Full name</span>
                      <input
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        placeholder="Full name"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        required
                        autoComplete="name"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[12px] font-medium text-slate-700">Phone</span>
                      <input
                        value={addPhone}
                        onChange={(e) => setAddPhone(e.target.value)}
                        placeholder="Phone number"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        required
                        autoComplete="tel"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[12px] font-medium text-slate-700">Email</span>
                      <input
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        type="email"
                        placeholder="Email (invitation sent here)"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        required
                        autoComplete="email"
                      />
                    </label>
                    <label className="block space-y-1 md:col-span-2">
                      <span className="text-[12px] font-medium text-slate-700">Assigned branches</span>
                      <div className="flex flex-wrap gap-2">
                        {branches.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() =>
                              setAddBranchIds((prev) =>
                                prev.includes(Number(b.id))
                                  ? prev.filter((id) => id !== Number(b.id))
                                  : [...prev, Number(b.id)],
                              )
                            }
                            className={[
                              "rounded-full px-3 py-1 text-xs",
                              addBranchIds.includes(Number(b.id)) ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700",
                            ].join(" ")}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </label>
                    <label className="block space-y-1 md:col-span-2">
                      <span className="text-[12px] font-medium text-slate-700">Home county (optional)</span>
                      <select
                        value={addCountyId}
                        onChange={(e) => setAddCountyId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        disabled={lookupLoading}
                      >
                        <option value="">— Not set —</option>
                        {counties.map((c) => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {addError ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{addError}</p>
                  ) : null}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addSubmitting || lookupLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {addSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      Add Worker
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {editTarget && (
            <EditWorkerModal
              worker={editTarget}
              counties={counties}
              lookupLoading={lookupLoading}
              onClose={() => setEditTarget(null)}
              onSaved={async () => {
                await reloadWorkers();
                setEditTarget(null);
              }}
            />
          )}

          {deleteTarget && (
            <DeleteWorkerModal
              worker={deleteTarget}
              onClose={() => setDeleteTarget(null)}
              onConfirm={async () => {
                await deactivateFieldWorker(deleteTarget.id);
                await reloadWorkers();
                setDeleteTarget(null);
              }}
            />
          )}

          {detailsTarget && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-4 py-8">
              <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-slate-900">Field Worker Details</h3>
                  <button
                    type="button"
                    onClick={() => setDetailsTarget(null)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <img
                    src={detailsTarget.avatar}
                    alt={detailsTarget.name}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-base font-semibold text-slate-900">{detailsTarget.name}</p>
                    <p className="text-xs text-slate-600">{detailsTarget.role}</p>
                    <span
                      className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-medium ${statusClasses(detailsTarget.status)}`}
                    >
                      {detailsTarget.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium text-slate-800">{detailsTarget.phone}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-slate-800">{detailsTarget.email}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">County</p>
                    <p className="font-medium text-slate-800">{detailsTarget.county}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Projects</p>
                    <p className="font-medium text-slate-800">{detailsTarget.projects}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Outlets Collected</p>
                    <p className="font-medium text-slate-800">{detailsTarget.outletsCollected}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">This Month</p>
                    <p className="font-medium text-slate-800">{detailsTarget.thisMonth}</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTarget(detailsTarget);
                      setDetailsTarget(null);
                    }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                  >
                    Edit Worker
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsTarget(null)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}

function EditWorkerModal({
  worker,
  counties,
  lookupLoading,
  onClose,
  onSaved,
}: {
  worker: FieldWorker;
  counties: CountyApiRow[];
  lookupLoading: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const matchId =
    worker.county && worker.county !== "—"
      ? String(counties.find((c) => c.name === worker.county)?.id ?? "")
      : "";
  const [name, setName] = React.useState(worker.name);
  const [email, setEmail] = React.useState(worker.email);
  const [phone, setPhone] = React.useState(worker.phone === "—" ? "" : worker.phone);
  const [countyId, setCountyId] = React.useState(matchId);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const id =
      worker.county && worker.county !== "—"
        ? String(counties.find((c) => c.name === worker.county)?.id ?? "")
        : "";
    setName(worker.name);
    setEmail(worker.email);
    setPhone(worker.phone === "—" ? "" : worker.phone);
    setCountyId(id);
    setErr(null);
  }, [worker, counties]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await updateFieldWorker(worker.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        county_id: countyId ? Number(countyId) : null,
      });
      await onSaved();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Edit Field Worker</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block space-y-1 md:col-span-2">
              <span className="text-[12px] font-medium text-slate-700">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-slate-700">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[12px] font-medium text-slate-700">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                required
              />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-[12px] font-medium text-slate-700">Home county</span>
              <select
                value={countyId}
                onChange={(e) => setCountyId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                disabled={lookupLoading}
              >
                <option value="">— Not set —</option>
                {counties.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {err ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{err}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || lookupLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteWorkerModal({
  worker,
  onClose,
  onConfirm,
}: {
  worker: FieldWorker;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold text-slate-900">Deactivate field worker</h3>
        <p className="mt-3 text-sm text-slate-600">
          Deactivate <span className="font-semibold">{worker.name}</span>? They will no longer be able to sign in until
          an administrator reactivates their account.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void (async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
              }
            })()}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

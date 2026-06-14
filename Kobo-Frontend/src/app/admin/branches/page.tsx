"use client";

import * as React from "react";
import { Menu, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  createBranch,
  deleteBranch,
  fetchBranchDetail,
  fetchBranches,
  updateBranch,
  type BranchApiRow,
} from "@/lib/api";

function BranchModal({
  open,
  branchId,
  onClose,
  onSaved,
}: {
  open: boolean;
  branchId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [managerName, setManagerName] = React.useState("");
  const [managerPhone, setManagerPhone] = React.useState("");
  const [status, setStatus] = React.useState<"active" | "inactive">("active");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        if (branchId) {
          const { branch } = await fetchBranchDetail(branchId);
          if (cancelled) return;
          setName(branch.name);
          setCode(branch.code ?? "");
          setRegion(branch.region ?? "");
          setManagerName(branch.manager_name ?? "");
          setManagerPhone(branch.manager_phone ?? "");
          setStatus(branch.status.toLowerCase() === "inactive" ? "inactive" : "active");
        } else {
          setName("");
          setCode("");
          setRegion("");
          setManagerName("");
          setManagerPhone("");
          setStatus("active");
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, branchId]);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const body = {
        name,
        code: code || null,
        region: region || null,
        manager_name: managerName || null,
        manager_phone: managerPhone || null,
        status,
      };
      if (branchId) {
        await updateBranch(branchId, body);
      } else {
        await createBranch(body);
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save branch");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {branchId ? "Edit Branch" : "Create Branch"}
        </h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Branch Name</span>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Branch Code</span>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Region / Area</span>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={region} onChange={(e) => setRegion(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Status</span>
                <select className="w-full rounded-lg border border-slate-200 px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Branch Manager</span>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Manager Contact</span>
                <input className="w-full rounded-lg border border-slate-200 px-3 py-2" value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} />
              </label>
            </div>
            {err ? <p className="text-sm text-rose-600">{err}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" disabled={saving || !name} onClick={() => void handleSave()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? "Saving…" : "Save Branch"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const [branches, setBranches] = React.useState<BranchApiRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const { branches: rows } = await fetchBranches({ search: search || undefined });
      setBranches(rows);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Failed to load branches");
    }
  }, [search]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = branches.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) || (b.code ?? "").toLowerCase().includes(q);
  });

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={toggleSidebar} className="rounded-lg border border-slate-200 p-2 lg:hidden" aria-label="Open menu">
                <Menu size={18} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
                <p className="text-sm text-slate-500">Manage Medina branches for census projects</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              >
                <Plus size={16} /> Add Branch
              </button>
            </div>
          </header>

          <div className="mb-4 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                placeholder="Search branches"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loadErr ? <p className="mb-4 text-sm text-rose-600">{loadErr}</p> : null}

          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
            <table className="min-w-[800px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Branch Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-4 py-3">{b.code ?? "—"}</td>
                    <td className="px-4 py-3">{b.region ?? "—"}</td>
                    <td className="px-4 py-3">{b.manager_name ?? "—"}</td>
                    <td className="px-4 py-3">{b.manager_phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={b.status === "Active" ? "text-emerald-700" : "text-slate-500"}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" title="Edit" onClick={() => { setEditId(b.id); setModalOpen(true); }} className="rounded-lg p-1.5 hover:bg-slate-100">
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Delete branch "${b.name}"?`)) {
                              void deleteBranch(b.id).then(load);
                            }
                          }}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <BranchModal
            open={modalOpen}
            branchId={editId}
            onClose={() => setModalOpen(false)}
            onSaved={() => void load()}
          />
        </>
      )}
    </AdminShell>
  );
}

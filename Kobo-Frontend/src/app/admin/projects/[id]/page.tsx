"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { AdminShell } from "../../dashboard/_components/AdminShell";
import { ProjectSubmissionsTab } from "./_components/ProjectSubmissionsTab";
import { ProjectMapTab } from "./_components/ProjectMapTab";
import { ProjectReportsTab } from "./_components/ProjectReportsTab";
import {
  fetchBranches,
  fetchFieldWorkers,
  fetchProjectAnalytics,
  fetchProjectDetail,
  fetchProjectFieldWorkers,
  fetchProjectSummary,
  fetchQuestionnaireDetail,
  fetchQuestionnaires,
  syncProjectFieldWorkers,
  updateProject,
  type BranchApiRow,
  type FieldWorkerRowApi,
  type ProjectDetailPayload,
  type ProjectFieldWorkerRow,
  type QuestionnaireApiRow,
} from "@/lib/api";

const TABS = ["overview", "field-workers", "questionnaire", "submissions", "map", "reports", "settings"] as const;

export default function ProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params?.id ?? 0);
  const tab = (searchParams.get("tab") ?? "overview") as (typeof TABS)[number];

  const [header, setHeader] = React.useState<Record<string, unknown> | null>(null);
  const [summary, setSummary] = React.useState<Record<string, number> | null>(null);
  const [analytics, setAnalytics] = React.useState<Record<string, unknown> | null>(null);
  const [fieldWorkers, setFieldWorkers] = React.useState<ProjectFieldWorkerRow[]>([]);
  const [questionnaire, setQuestionnaire] = React.useState<unknown>(null);
  const [detail, setDetail] = React.useState<unknown>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!Number.isFinite(projectId) || projectId <= 0) return;
    void (async () => {
      try {
        const [s, d] = await Promise.all([fetchProjectSummary(projectId), fetchProjectDetail(projectId)]);
        setHeader(s.header);
        setSummary(s.summary);
        setDetail(d);
        if (d.project.questionnaire_id) {
          const q = await fetchQuestionnaireDetail(d.project.questionnaire_id);
          setQuestionnaire(q.questionnaire);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load project");
      }
    })();
  }, [projectId]);

  React.useEffect(() => {
    if (!Number.isFinite(projectId)) return;
    if (tab === "overview") {
      void fetchProjectAnalytics(projectId).then(setAnalytics);
    } else if (tab === "field-workers") {
      void fetchProjectFieldWorkers(projectId).then((r) => setFieldWorkers(r.field_workers));
    }
  }, [projectId, tab]);

  if (!Number.isFinite(projectId) || projectId <= 0) {
    return <p className="p-8 text-rose-600">Invalid project</p>;
  }

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="mb-4 flex items-start gap-3">
            <button type="button" onClick={toggleSidebar} className="rounded-lg border p-2 lg:hidden"><Menu size={18} /></button>
            <Link href="/admin/projects" className="mt-2 text-slate-500"><ArrowLeft size={18} /></Link>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{String(header?.name ?? "Project")}</h1>
              <p className="text-sm text-slate-500">
                Status: {String(header?.status ?? "—")} · Branch: {String(header?.branch ?? "—")} · Period: {String(header?.period_start ?? "")} – {String(header?.period_end ?? "")}
              </p>
              <p className="text-sm text-slate-500">Questionnaire: {String(header?.questionnaire ?? "—")}</p>
            </div>
          </header>

          {err ? <p className="mb-4 text-sm text-rose-600">{err}</p> : null}

          {summary && (
            <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {[
                ["Total Submissions", summary.total_submissions],
                ["Approved", summary.approved],
                ["Pending", summary.pending_review],
                ["Rejected", summary.rejected],
                ["Field Workers", summary.assigned_field_workers],
              ].map(([label, val]) => (
                <div key={String(label)} className="rounded-xl border bg-white p-3 shadow-sm">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-xl font-bold text-slate-900">{val}</p>
                </div>
              ))}
            </section>
          )}

          <nav className="mb-6 flex flex-wrap gap-1 border-b border-slate-200 pb-1">
            {TABS.map((t) => (
              <Link
                key={t}
                href={`/admin/projects/${projectId}?tab=${t}`}
                className={["rounded-t-lg px-3 py-2 text-sm capitalize", tab === t ? "bg-emerald-50 font-medium text-emerald-800" : "text-slate-600 hover:bg-slate-50"].join(" ")}
              >
                {t.replace("-", " ")}
              </Link>
            ))}
          </nav>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            {tab === "overview" && analytics && (
              <div className="space-y-4 text-sm">
                <p>GPS completion: {String(analytics.gps_completion_rate ?? 0)}%</p>
                <p>Photo completion: {String(analytics.photo_completion_rate ?? 0)}%</p>
                <div>
                  <p className="font-medium mb-1">Submissions by field worker</p>
                  <ul className="list-disc pl-5 text-slate-600">
                    {Object.entries((analytics.submissions_by_worker as Record<string, number>) ?? {}).map(([k, v]) => (
                      <li key={k}>{k}: {v}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {tab === "field-workers" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-500">Field workers assigned to this project.</p>
                  <Link
                    href={`/admin/projects/${projectId}?tab=settings`}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Assign field workers
                  </Link>
                </div>
                {fieldWorkers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <p className="text-sm text-slate-600">No field workers assigned yet.</p>
                    <Link href={`/admin/projects/${projectId}?tab=settings`} className="mt-2 inline-block text-sm font-medium text-emerald-700 hover:underline">
                      Assign field workers →
                    </Link>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50"><tr><th className="p-2 text-left">Name</th><th>Phone</th><th>Branch</th><th>Submissions</th><th>Status</th></tr></thead>
                    <tbody>
                      {fieldWorkers.map((fw) => (
                        <tr key={String(fw.id)} className="border-t">
                          <td className="p-2">{String(fw.name)}</td>
                          <td>{String(fw.phone)}</td>
                          <td>{String(fw.branch)}</td>
                          <td>{String(fw.submissions)}</td>
                          <td>{String(fw.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            {tab === "questionnaire" && questionnaire != null && (() => {
              const q = questionnaire as {
                name?: string;
                description?: string | null;
                status?: string;
                created_at?: string;
                schema_json?: { fields?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | Record<string, unknown> | null;
              };
              const rawSchema = q.schema_json as Record<string, unknown> | null | undefined;
              type Field = Record<string, unknown>;
              type Section = { key?: unknown; title?: unknown; fields?: Field[] };
              const sections: Section[] =
                rawSchema != null && Array.isArray((rawSchema as { sections?: unknown }).sections)
                  ? (rawSchema.sections as Section[])
                  : [];
              const flatFields: Field[] =
                sections.length > 0
                  ? sections.flatMap((s) => s.fields ?? [])
                  : Array.isArray(rawSchema)
                  ? (rawSchema as Field[])
                  : rawSchema != null && Array.isArray((rawSchema as { fields?: unknown }).fields)
                  ? ((rawSchema as { fields: Field[] }).fields)
                  : [];
              const totalFields = flatFields.length;
              const statusColor: Record<string, string> = {
                active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                draft: "bg-slate-100 text-slate-600 ring-slate-200",
                archived: "bg-rose-50 text-rose-700 ring-rose-200",
              };
              const typeColors: Record<string, string> = {
                text: "bg-blue-50 text-blue-700",
                number: "bg-purple-50 text-purple-700",
                select: "bg-amber-50 text-amber-700",
                radio: "bg-amber-50 text-amber-700",
                checkbox: "bg-teal-50 text-teal-700",
                date: "bg-indigo-50 text-indigo-700",
                photo: "bg-rose-50 text-rose-700",
                image: "bg-rose-50 text-rose-700",
                gps: "bg-emerald-50 text-emerald-700",
                location: "bg-emerald-50 text-emerald-700",
              };
              const renderField = (field: Field, i: number) => {
                const label = String(field.label ?? field.name ?? field.key ?? field.id ?? `Field ${i + 1}`);
                const type = String(field.type ?? field.input_type ?? "text");
                const required = Boolean(field.required ?? field.mandatory ?? false);
                const hint = field.hint ?? field.placeholder ?? field.help_text;
                return (
                  <div key={String(field.id ?? field.key ?? i)} className="flex items-start justify-between rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{label}</span>
                        {required && <span className="text-xs text-rose-500 font-medium">Required</span>}
                      </div>
                      {hint != null && <p className="mt-0.5 text-xs text-slate-400">{String(hint)}</p>}
                    </div>
                    <span className={`ml-3 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${typeColors[type.toLowerCase()] ?? "bg-slate-100 text-slate-600"}`}>{type}</span>
                  </div>
                );
              };
              return (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{q.name ?? "—"}</h2>
                      {q.description && <p className="mt-1 text-sm text-slate-500">{q.description}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {q.status && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 capitalize ${statusColor[q.status.toLowerCase()] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                          {q.status}
                        </span>
                      )}
                      {q.created_at && (
                        <span className="text-xs text-slate-400">Created {new Date(q.created_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  {sections.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500">{sections.length} section{sections.length !== 1 ? "s" : ""} · {totalFields} field{totalFields !== 1 ? "s" : ""}</p>
                      {sections.map((section, si) => (
                        <div key={String(section.key ?? si)} className="rounded-xl border border-slate-200 overflow-hidden">
                          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                            <span className="font-medium text-slate-800">{String(section.title ?? section.key ?? `Section ${si + 1}`)}</span>
                            <span className="ml-2 text-xs text-slate-400">{section.fields?.length ?? 0} fields</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {(section.fields ?? []).map((field, fi) => renderField(field, fi))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : flatFields.length > 0 ? (
                    <div>
                      <p className="mb-3 text-sm text-slate-500">{flatFields.length} field{flatFields.length !== 1 ? "s" : ""}</p>
                      <div className="space-y-2">{flatFields.map((field, i) => renderField(field, i))}</div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Schema</p>
                      <pre className="text-xs text-slate-700 overflow-auto max-h-96">{JSON.stringify(rawSchema, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })()}
            {tab === "submissions" && <ProjectSubmissionsTab projectId={projectId} />}
            {tab === "map" && <ProjectMapTab projectId={projectId} />}
            {tab === "reports" && <ProjectReportsTab projectId={projectId} />}
            {tab === "settings" && detail != null && (
              <ProjectSettingsForm
                projectId={projectId}
                detail={detail as ProjectDetailPayload}
                onSaved={() => {
                  void fetchProjectSummary(projectId).then((s) => { setHeader(s.header); setSummary(s.summary); });
                  void fetchProjectDetail(projectId).then(setDetail);
                }}
              />
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}

function ProjectSettingsForm({
  projectId,
  detail,
  onSaved,
}: {
  projectId: number;
  detail: ProjectDetailPayload;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(detail.project.name);
  const [description, setDescription] = React.useState(detail.project.description ?? "");
  const [status, setStatus] = React.useState(detail.project.status.toLowerCase());
  const [branchId, setBranchId] = React.useState(detail.project.branch_id ? String(detail.project.branch_id) : "");
  const [questionnaireId, setQuestionnaireId] = React.useState(detail.project.questionnaire_id ? String(detail.project.questionnaire_id) : "");
  const [startDate, setStartDate] = React.useState((detail.project.start_date ?? "").slice(0, 10));
  const [endDate, setEndDate] = React.useState((detail.project.end_date ?? "").slice(0, 10));
  const [selectedWorkers, setSelectedWorkers] = React.useState<number[]>([]);

  const [branches, setBranches] = React.useState<BranchApiRow[]>([]);
  const [questionnaires, setQuestionnaires] = React.useState<QuestionnaireApiRow[]>([]);
  const [workers, setWorkers] = React.useState<FieldWorkerRowApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      const errors: string[] = [];
      const [b, q, w, pfw] = await Promise.allSettled([
        fetchBranches(),
        fetchQuestionnaires(),
        fetchFieldWorkers(),
        fetchProjectFieldWorkers(projectId),
      ]);
      if (b.status === "fulfilled") setBranches(b.value.branches); else errors.push("branches");
      if (q.status === "fulfilled") setQuestionnaires(q.value.questionnaires); else errors.push("questionnaires");
      if (w.status === "fulfilled") setWorkers(w.value.workers); else errors.push("field workers");
      if (pfw.status === "fulfilled") {
        setSelectedWorkers(
          pfw.value.field_workers.map((r) => Number(r.field_worker_id)).filter((n) => Number.isFinite(n)),
        );
      }
      setLoadError(errors.length ? `Failed to load: ${errors.join(", ")}` : null);
      setLoading(false);
    })();
  }, [projectId]);

  const toggleWorker = (id: number) =>
    setSelectedWorkers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateProject(projectId, {
        name,
        description,
        status: status as "draft" | "active" | "paused" | "completed",
        branch_id: branchId ? Number(branchId) : null,
        questionnaire_id: questionnaireId ? Number(questionnaireId) : null,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      if (branchId) {
        await syncProjectFieldWorkers(
          projectId,
          selectedWorkers.map((fwId) => ({ field_worker_id: fwId, branch_id: Number(branchId), status: "active" })),
        );
      }
      onSaved();
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

  return (
    <form className="max-w-xl space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Project name</label>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
          <textarea className={field} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Start date</label>
            <input type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">End date</label>
            <input type="date" className={field} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <select className={field} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {loadError && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">{loadError}</p>}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Branch</label>
        <select className={field} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">{loading ? "Loading branches…" : "Select branch"}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}{b.region ? ` · ${b.region}` : ""}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Questionnaire</label>
        <select className={field} value={questionnaireId} onChange={(e) => setQuestionnaireId(e.target.value)}>
          <option value="">
            {loading ? "Loading questionnaires…" : questionnaires.length === 0 ? "No questionnaires available" : "Select questionnaire"}
          </option>
          {questionnaires.map((q) => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-500">Field workers</label>
          <span className="text-xs text-slate-400">{selectedWorkers.length} selected</span>
        </div>
        {!branchId && <p className="mb-2 text-xs text-amber-600">Select a branch to save field-worker assignments.</p>}
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {loading && <p className="p-2 text-sm text-slate-500">Loading field workers…</p>}
          {!loading && workers.length === 0 && <p className="p-2 text-sm text-slate-500">No field workers found.</p>}
          {workers.map((w) => (
            <label key={w.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selectedWorkers.includes(Number(w.id))}
                onChange={() => toggleWorker(Number(w.id))}
              />
              <span className="text-sm text-slate-700">{w.name}{w.phone ? ` · ${w.phone}` : ""}</span>
            </label>
          ))}
        </div>
      </div>

      {saveError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{saveError}</p>}
      {saved && !saveError && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved.</p>}

      <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-70">
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

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
  fetchProjectAnalytics,
  fetchProjectDetail,
  fetchProjectFieldWorkers,
  fetchProjectSummary,
  fetchQuestionnaireDetail,
  updateProject,
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
  const [fieldWorkers, setFieldWorkers] = React.useState<Array<Record<string, unknown>>>([]);
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
              <ProjectSettingsForm projectId={projectId} detail={detail as { project: { name: string; description?: string; status: string } }} onSaved={() => void fetchProjectSummary(projectId).then((s) => { setHeader(s.header); setSummary(s.summary); })} />
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
  detail: { project: { name: string; description?: string; status: string } };
  onSaved: () => void;
}) {
  const [name, setName] = React.useState(detail.project.name);
  const [description, setDescription] = React.useState(detail.project.description ?? "");
  const [status, setStatus] = React.useState(detail.project.status.toLowerCase());
  const [saving, setSaving] = React.useState(false);

  return (
    <form className="space-y-3 max-w-md" onSubmit={(e) => {
      e.preventDefault();
      setSaving(true);
      void updateProject(projectId, { name, description, status: status as "draft" | "active" | "paused" | "completed" })
        .then(onSaved)
        .finally(() => setSaving(false));
    }}>
      <input className="w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className="w-full rounded-lg border px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      <select className="w-full rounded-lg border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="completed">Completed</option>
      </select>
      <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">{saving ? "Saving…" : "Save settings"}</button>
    </form>
  );
}

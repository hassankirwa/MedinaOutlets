"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";
import { AdminShell } from "../../dashboard/_components/AdminShell";
import {
  createProject,
  fetchBranches,
  fetchFieldWorkers,
  fetchQuestionnaires,
  publishProject,
  syncProjectFieldWorkers,
  updateProject,
  type BranchApiRow,
  type FieldWorkerRowApi,
  type QuestionnaireApiRow,
} from "@/lib/api";

const STEPS = ["Details", "Select Branch", "Questionnaire", "Field Workers", "Publish"];

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [status, setStatus] = React.useState<"draft" | "active">("draft");
  const [branches, setBranches] = React.useState<BranchApiRow[]>([]);
  const [branchId, setBranchId] = React.useState("");
  const [questionnaires, setQuestionnaires] = React.useState<QuestionnaireApiRow[]>([]);
  const [questionnaireId, setQuestionnaireId] = React.useState("");
  const [workers, setWorkers] = React.useState<FieldWorkerRowApi[]>([]);
  const [selectedWorkers, setSelectedWorkers] = React.useState<number[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    void Promise.all([fetchBranches(), fetchQuestionnaires(), fetchFieldWorkers()]).then(
      ([b, q, w]) => {
        setBranches(b.branches);
        setQuestionnaires(q.questionnaires);
        setWorkers(w.workers);
      },
    );
  }, []);

  const nextStep = async () => {
    setErr(null);
    setSaving(true);
    try {
      if (step === 0) {
        if (!projectId) {
          const { project } = await createProject({
            name,
            description,
            start_date: startDate || null,
            end_date: endDate || null,
            status,
          });
          setProjectId(project.id);
        } else {
          await updateProject(projectId, {
            name,
            description,
            start_date: startDate || null,
            end_date: endDate || null,
            status,
          });
        }
      } else if (step === 1 && projectId) {
        if (!branchId) throw new Error("Select a branch");
        await updateProject(projectId, { branch_id: Number(branchId) });
      } else if (step === 2 && projectId) {
        if (!questionnaireId) throw new Error("Select a questionnaire");
        await updateProject(projectId, { questionnaire_id: Number(questionnaireId) });
      } else if (step === 3 && projectId) {
        if (!branchId) throw new Error("Select a branch first");
        await syncProjectFieldWorkers(
          projectId,
          selectedWorkers.map((fwId) => ({
            field_worker_id: fwId,
            branch_id: Number(branchId),
            status: "active",
          })),
        );
      } else if (step === 4 && projectId) {
        await publishProject(projectId);
        router.push(`/admin/projects/${projectId}`);
        return;
      }
      setStep((s) => s + 1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save step");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <div className="max-w-3xl">
          <header className="mb-6 flex items-center gap-3">
            <button type="button" onClick={toggleSidebar} className="rounded-lg border p-2 lg:hidden"><Menu size={18} /></button>
            <Link href="/admin/projects" className="text-slate-500 hover:text-slate-700"><ArrowLeft size={18} /></Link>
            <h1 className="text-xl font-bold text-slate-900">Create Project</h1>
          </header>

          <div className="mb-6 flex gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className={["flex-1 rounded-lg px-2 py-2 text-center text-xs font-medium", i <= step ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"].join(" ")}>
                {i + 1}. {label}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            {step === 0 && (
              <div className="space-y-3">
                <input className="w-full rounded-lg border px-3 py-2" placeholder="Project Name" value={name} onChange={(e) => setName(e.target.value)} />
                <textarea className="w-full rounded-lg border px-3 py-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="rounded-lg border px-3 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <input type="date" className="rounded-lg border px-3 py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <select className="w-full rounded-lg border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as "draft" | "active")}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Select the Medina branch this census project belongs to.</p>
                <select className="w-full rounded-lg border px-3 py-2" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                  <option value="">Select Branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{b.region ? ` · ${b.region}` : ""}</option>)}
                </select>
              </div>
            )}
            {step === 2 && (
              <select className="w-full rounded-lg border px-3 py-2" value={questionnaireId} onChange={(e) => setQuestionnaireId(e.target.value)}>
                <option value="">Select questionnaire template</option>
                {questionnaires.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}
              </select>
            )}
            {step === 3 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {workers.map((w) => (
                  <label key={w.id} className="flex items-center gap-2 rounded-lg border p-2">
                    <input type="checkbox" checked={selectedWorkers.includes(Number(w.id))} onChange={() => setSelectedWorkers((prev) => prev.includes(Number(w.id)) ? prev.filter((id) => id !== Number(w.id)) : [...prev, Number(w.id)])} />
                    <span className="text-sm">{w.name} · {w.phone}</span>
                  </label>
                ))}
              </div>
            )}
            {step === 4 && (
              <dl className="space-y-2 text-sm">
                <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{name}</dd></div>
                <div><dt className="text-slate-500">Branch</dt><dd>{branches.find((b) => b.id === branchId)?.name}</dd></div>
                <div><dt className="text-slate-500">Questionnaire</dt><dd>{questionnaires.find((q) => q.id === questionnaireId)?.name}</dd></div>
                <div><dt className="text-slate-500">Field Workers</dt><dd>{selectedWorkers.length}</dd></div>
              </dl>
            )}
            {err ? <p className="mt-3 text-sm text-rose-600">{err}</p> : null}
            <div className="mt-6 flex justify-between">
              <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)} className="rounded-lg px-4 py-2 text-sm text-slate-600 disabled:opacity-40">Back</button>
              <button type="button" disabled={saving} onClick={() => void nextStep()} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {saving ? "Saving…" : step === 4 ? "Publish Project" : "Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

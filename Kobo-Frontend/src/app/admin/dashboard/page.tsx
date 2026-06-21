"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Menu,
  MapPin,
  Calendar,
  FileDown,
  Store,
  Users,
  ClipboardList,
  UserCheck,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import { AdminShell } from "./_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  fetchDashboardStats,
  fetchOutletsApi,
  readUserProfile,
  type AuthUser,
  type DashboardStats,
} from "@/lib/api";
import {
  apiOutletToPoint,
  categoryBlocksFromOutletRows,
  type ApiOutletRow,
} from "@/lib/outletTransform";
import { isValidGpsCoordinate } from "@/components/maps/map-utils";

const COLORS = ["#2563eb", "#ec4899", "#f59e0b", "#22c55e", "#ef4444"];

function formatApiStatus(status: string | undefined): string {
  const key = (status ?? "pending").toLowerCase();
  if (key === "approved") {
    return "Approved";
  }
  if (key === "rejected") {
    return "Rejected";
  }
  return "Pending";
}

function formatTrendLabel(dateStr: string): string {
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    return dateStr;
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const EMPTY_STATS: DashboardStats = {
  totalOutlets: 0,
  countiesCovered: 0,
  fieldWorkers: 0,
  submissionsToday: 0,
  dataQualityPct: 0,
  outletsByType: {},
  outletsByStatus: {},
  registeredOutlets: 0,
  unregisteredOutlets: 0,
  medilabYes: 0,
  medilabNo: 0,
  fieldWorkerStats: [],
  submissionTrends: [],
};

const TYPE_ORDER = [
  "Pharmacy",
  "Clinic / Dispensary",
  "Agrovet",
  "Shop",
  "Hospital",
] as const;

const OutletDistributionMap = dynamic(
  () =>
    import("@/components/maps/OutletDistributionMap").then(
      (m) => m.OutletDistributionMap,
    ),
  { ssr: false },
);

function ShellCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 px-5 pt-4 pb-2">
        <h3 className="text-[13px] font-semibold text-slate-800">{title}</h3>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  iconBg,
  iconFg,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle: string;
  iconBg: string;
  iconFg: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset ring-white/40 ${iconBg}`}
        >
          <Icon size={22} className={iconFg} />
        </div>
        <ArrowUpRight
          size={16}
          className="text-slate-300 transition-colors group-hover:text-slate-500"
        />
      </div>
      <div className="mt-3">
        <div className="text-[12px] font-medium text-slate-500">{title}</div>
        <div className="mt-1 text-[30px] font-bold leading-none tracking-tight text-slate-900">
          {value}
        </div>
        <div className="mt-2 text-[11px] text-slate-400">{subtitle}</div>
      </div>
      <div className="mt-4 h-[2px] w-full rounded bg-slate-100" />
      <div className="mt-3 flex items-end gap-1.5">
        {[30, 20, 26, 18, 24, 32, 22].map((h, idx) => (
          <span
            key={idx}
            className="block w-2 rounded-full bg-gradient-to-t from-emerald-200 to-emerald-400/70"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "Approved"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "Pending"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-rose-50 text-rose-700 border-rose-100";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] ${styles}`}>
      {status}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [outletPoints, setOutletPoints] = React.useState<
    ReturnType<typeof apiOutletToPoint>[]
  >([]);
  const [apiRows, setApiRows] = React.useState<ApiOutletRow[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<AuthUser | null>(null);

  React.useEffect(() => {
    function sync() {
      setProfile(readUserProfile());
    }
    sync();
    window.addEventListener("kobo-profile", sync);
    return () => window.removeEventListener("kobo-profile", sync);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void (async () => {
      const results = await Promise.allSettled([
        fetchDashboardStats(),
        fetchOutletsApi(),
      ]);
      if (cancelled) {
        return;
      }
      const [statsResult, outletsResult] = results;
      const errs: string[] = [];
      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStats(null);
        errs.push(
          statsResult.reason instanceof Error
            ? statsResult.reason.message
            : "Dashboard stats failed",
        );
      }
      if (outletsResult.status === "fulfilled") {
        const rows = outletsResult.value;
        setApiRows(rows);
        setOutletPoints(rows.map((r) => apiOutletToPoint(r)));
      } else {
        setApiRows([]);
        setOutletPoints([]);
        errs.push(
          outletsResult.reason instanceof Error
            ? outletsResult.reason.message
            : "Outlets failed",
        );
      }
      if (errs.length === 2) {
        setLoadError(errs.join(" · "));
      } else if (errs.length === 1) {
        setLoadError(`Partial load: ${errs[0]}`);
      } else {
        setLoadError(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const s = stats ?? EMPTY_STATS;
  const categoryBlocks = categoryBlocksFromOutletRows(apiRows);
  const outletTypes = TYPE_ORDER.map((name) => ({
    name,
    value: s.outletsByType[name] ?? 0,
  })).filter((x) => x.value > 0);
  const barData =
    outletTypes.length > 0 ? outletTypes : [{ name: "No data", value: 0 }];

  const trends =
    s.submissionTrends.length > 0
      ? s.submissionTrends.map((t) => ({
          date: formatTrendLabel(t.date),
          outlets: t.outlets,
        }))
      : [{ date: "—", outlets: 0 }];

  const workerData =
    s.fieldWorkerStats.length > 0
      ? s.fieldWorkerStats.map((w) => [w.name, w.outlets, w.pct] as [string, number, string])
      : [["—", 0, "0%"]];

  const recent =
    outletPoints.length > 0
      ? outletPoints.slice(0, 8).map((o) => ({
          name: o.name,
          type: o.type,
          location: o.location,
          worker: o.fieldWorker,
          status: formatApiStatus(o.status),
          submitted: o.submittedAt,
        }))
      : [];

  const mapMiniPoints = outletPoints
    .filter((o) => isValidGpsCoordinate(o.lat, o.lng))
    .slice(0, 40)
    .map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      lat: o.lat,
      lng: o.lng,
    }));

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                <h1 className="text-[22px] font-bold text-slate-900">Dashboard</h1>
                <p className="text-[12px] text-slate-500">
                  Overview of outlet census data
                  {profile ? (
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt=""
                          width={28}
                          height={28}
                          className="rounded-full object-cover ring-2 ring-slate-200/80"
                        />
                      ) : null}
                      <span className="block">
                        Signed in as <span className="font-medium text-slate-800">{profile.name}</span>
                        {profile.company?.name ? ` · ${profile.company.name}` : ""}
                        {profile.role?.name ? ` · ${profile.role.name}` : ""}
                      </span>
                    </span>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-2 lg:flex xl:gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] text-slate-700 shadow-sm"
              >
                <MapPin size={15} className="text-slate-600" /> Nairobi County
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] text-slate-700 shadow-sm"
              >
                <Calendar size={15} className="text-slate-600" /> May 1 - May 31, 2026
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <div className="shrink-0 [&_button]:shadow-sm">
                <NotificationBell />
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <FileDown size={15} /> Export
              </button>
            </div>
          </header>

          <div className="mt-4 flex flex-wrap items-center gap-2 lg:hidden">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-sm"
            >
              <MapPin size={14} className="text-slate-600" /> Nairobi County
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-sm"
            >
              <Calendar size={14} className="text-slate-600" /> May 1 - May 31, 2026
              <ChevronDown size={13} className="text-slate-400" />
            </button>
            
            <div className="shrink-0">
              <NotificationBell />
            </div>
            
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <FileDown size={14} /> Export
            </button>
          </div>

          {loadError ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              {loadError} — sign in again if your session expired.
            </p>
          ) : null}

          <div className="mt-6 space-y-6">
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                icon={Store}
                title="Total Outlets"
                value={s.totalOutlets.toLocaleString()}
                subtitle="All outlets collected"
                iconBg="bg-emerald-50"
                iconFg="text-emerald-600"
              />
              <StatCard
                icon={MapPin}
                title="Counties Covered"
                value={s.countiesCovered.toLocaleString()}
                subtitle="Total counties"
                iconBg="bg-blue-50"
                iconFg="text-blue-600"
              />
              <StatCard
                icon={Users}
                title="Field Workers"
                value={s.fieldWorkers.toLocaleString()}
                subtitle="Active users"
                iconBg="bg-violet-50"
                iconFg="text-violet-600"
              />
              <StatCard
                icon={ClipboardList}
                title="Submissions Today"
                value={s.submissionsToday.toLocaleString()}
                subtitle="Outlets submitted"
                iconBg="bg-amber-50"
                iconFg="text-amber-700"
              />
              <StatCard
                icon={UserCheck}
                title="Data Quality"
                value={`${s.dataQualityPct}%`}
                subtitle="Complete entries"
                iconBg="bg-emerald-50"
                iconFg="text-emerald-600"
              />
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <ShellCard
                title="Outlets by Type"
                right={
                  <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">
                    This Month <ChevronDown size={14} className="text-slate-400" />
                  </button>
                }
              >
                <div className="min-w-0">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData} margin={{ left: 8, right: 8, top: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                  </ResponsiveContainer>
                </div>
              </ShellCard>

              <ShellCard title="Medical Facility Status">
                <div className="grid items-center gap-4 sm:grid-cols-[1fr_140px]">
                  <div className="min-w-0">
                    <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Registered", value: Math.max(s.registeredOutlets, 0) },
                          { name: "Unregistered", value: Math.max(s.unregisteredOutlets, 0) },
                        ]}
                        innerRadius={62}
                        outerRadius={86}
                        dataKey="value"
                        stroke="transparent"
                      >
                        <Cell fill="#16a34a" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                        Registered
                      </span>
                      <span className="font-semibold text-slate-800">{s.registeredOutlets.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Unregistered
                      </span>
                      <span className="font-semibold text-slate-800">{s.unregisteredOutlets.toLocaleString()}</span>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-center">
                      <div className="text-[10px] text-slate-500">Total</div>
                      <div className="text-[18px] font-bold text-slate-900">{s.totalOutlets.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </ShellCard>

              <ShellCard title="Outlets Serviced by Medilab">
                <div className="grid items-center gap-4 sm:grid-cols-[1fr_140px]">
                  <div className="min-w-0">
                    <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Yes", value: Math.max(s.medilabYes, 0) },
                          { name: "No", value: Math.max(s.medilabNo, 0) },
                        ]}
                        innerRadius={62}
                        outerRadius={86}
                        dataKey="value"
                        stroke="transparent"
                      >
                        <Cell fill="#16a34a" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-600" />
                        Yes
                      </span>
                      <span className="font-semibold text-slate-800">{s.medilabYes.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                        No
                      </span>
                      <span className="font-semibold text-slate-800">{s.medilabNo.toLocaleString()}</span>
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-center">
                      <div className="text-[10px] text-slate-500">Total</div>
                      <div className="text-[18px] font-bold text-slate-900">{s.totalOutlets.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </ShellCard>
            </section>

            <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <ShellCard
                title="Outlets Collected by Field Worker"
                right={
                  <button className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800">
                    View All
                  </button>
                }
              >
                <div className="-mx-1 overflow-x-auto rounded-xl border border-slate-100 sm:mx-0">
                  <table className="min-w-[560px] w-full text-[12px]">
                    <thead className="bg-slate-700 text-white">
                      <tr>
                        <th className="p-3 text-left font-semibold">Field Worker</th>
                        <th className="p-3 text-left font-semibold">Outlets</th>
                        <th className="p-3 text-left font-semibold">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workerData.map((row) => (
                        <tr key={row[0]} className="border-b border-slate-100 last:border-b-0">
                          <td className="p-3 text-slate-700">{row[0]}</td>
                          <td className="p-3 font-semibold text-slate-800">{row[1]}</td>
                          <td className="p-3 text-slate-600">{row[2]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ShellCard>

              <ShellCard
                title="Outlets Collected Over Time"
                right={
                  <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">
                    Daily <ChevronDown size={14} className="text-slate-400" />
                  </button>
                }
              >
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={trends} margin={{ left: 8, right: 18, top: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="outlets"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: "#16a34a" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ShellCard>
            </section>

            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {categoryBlocks.map((block) => (
                <ShellCard key={block.title} title={block.title}>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart
                      data={block.bars.map(([name, value, color]) => ({ name, value, color }))}
                      margin={{ left: 6, right: 6, top: 10 }}
                    >
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        {block.bars.map((b, idx) => (
                          <Cell key={idx} fill={String(b[2])} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-3 space-y-2 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Category</span>
                      <span>Outlets</span>
                    </div>
                    {block.bars.map(([name, value, color]) => (
                      <div key={String(name)} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: String(color) }} />
                          <span className="truncate">{String(name)}</span>
                        </span>
                        <span className="font-semibold text-slate-800">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </ShellCard>
              ))}
            </section>

            <section>
              <ShellCard title="Outlet Distribution Map">
                <OutletDistributionMap points={mapMiniPoints} />
              </ShellCard>
            </section>

            <section>
              <ShellCard
                title="Recent Submissions"
                right={
                  <button className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800">
                    View All
                  </button>
                }
              >
                <div className="-mx-1 overflow-x-auto rounded-xl border border-slate-100 sm:mx-0">
                  <table className="min-w-[920px] w-full text-[12px]">
                    <thead className="bg-slate-700 text-white">
                      <tr>
                        <th className="p-3 text-left font-semibold">Facility Name</th>
                        <th className="p-3 text-left font-semibold">Type</th>
                        <th className="p-3 text-left font-semibold">Location</th>
                        <th className="p-3 text-left font-semibold">Field Worker</th>
                        <th className="p-3 text-left font-semibold">Status</th>
                        <th className="p-3 text-left font-semibold">Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500">
                            No submissions yet.
                          </td>
                        </tr>
                      ) : (
                        recent.map((r) => (
                          <tr key={r.name + r.submitted} className="border-b border-slate-100 last:border-b-0">
                            <td className="p-3 text-slate-700">{r.name}</td>
                            <td className="p-3 text-slate-600">{r.type}</td>
                            <td className="p-3 text-slate-600">{r.location}</td>
                            <td className="p-3 text-slate-700">{r.worker}</td>
                            <td className="p-3">
                              <StatusPill status={r.status} />
                            </td>
                            <td className="p-3 text-slate-600">{r.submitted}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </ShellCard>
            </section>
          </div>
        </>
      )}
    </AdminShell>
  );
}

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  Calendar,
  ChevronDown,
  CheckCircle2,
  CircleDot,
  Loader2,
  MapPin,
  Menu,
  Store,
  Stethoscope,
  Leaf,
  ShoppingBag,
  Hospital,
  User,
  Phone,
  XCircle,
} from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  fetchOutletsApi,
  updateOutletStatus,
  canReviewOutletSubmissions,
  readUserProfile,
  type OutletReviewStatus,
} from "@/lib/api";
import { apiOutletToPoint, type ApiOutletRow } from "@/lib/outletTransform";
import { OUTLETS, type OutletPoint } from "@/components/maps/outlet-map-data";

const OutletMapViewMap = dynamic(
  () => import("@/components/maps/OutletMapViewMap").then((m) => m.OutletMapViewMap),
  { ssr: false },
);

function buildTypeStats(outlets: OutletPoint[]) {
  const types = ["Pharmacy", "Clinic / Dispensary", "Agrovet", "Shop", "Hospital"] as const;
  const byType = Object.fromEntries(types.map((t) => [t, 0])) as Record<(typeof types)[number], number>;
  for (const o of outlets) {
    if (o.type in byType) {
      byType[o.type] += 1;
    }
  }
  return {
    total: outlets.length,
    ...byType,
  };
}

function reviewLabel(status: string | undefined): string {
  const s = (status ?? "pending").toLowerCase();
  if (s === "approved") {
    return "Approved";
  }
  if (s === "rejected") {
    return "Rejected";
  }
  return "Pending";
}

function OutletDetailsCard({
  outlet,
  canReview,
  updating,
  onReview,
}: {
  outlet: OutletPoint;
  canReview: boolean;
  updating: boolean;
  onReview: (id: string, status: OutletReviewStatus) => void;
}) {
  const rev = reviewLabel(outlet.status);
  const revCls =
    rev === "Approved"
      ? "bg-emerald-50 text-emerald-700"
      : rev === "Rejected"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";
  const RevIcon = rev === "Approved" ? CheckCircle2 : rev === "Rejected" ? XCircle : CircleDot;

  return (
    <aside className="w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm xl:w-[320px]">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-slate-900">{outlet.name}</h3>
          <span
            className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${
              outlet.accountStatus === "Registered"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {outlet.accountStatus}
          </span>
        </div>
      </div>

      <div className="mb-3 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
        <img
          src={`https://ui-avatars.com/api/?size=400&background=f8fafc&color=334155&name=${encodeURIComponent(outlet.name)}`}
          alt=""
          className="h-24 w-full object-cover"
        />
      </div>

      <div className="space-y-3 text-[12px] text-slate-700">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Review status</span>
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${revCls}`}>
            <RevIcon size={13} />
            {rev}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Type</span>
          <span className="font-medium">{outlet.type}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <User size={13} /> Owner
          </span>
          <span className="font-medium">{outlet.owner}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Phone size={13} /> Phone
          </span>
          <span className="font-medium">{outlet.phone}</span>
        </div>
        <div>
          <span className="text-slate-500">Location</span>
          <p className="mt-1 text-right font-medium">{outlet.location}</p>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Field Worker</span>
          <span className="font-medium">{outlet.fieldWorker}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Serviced by Medilab</span>
          <span className="font-medium">{outlet.servicedByMedilab}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Submitted At</span>
          <span className="font-medium">{outlet.submittedAt}</span>
        </div>
      </div>

      {canReview ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-[11px] font-medium text-slate-500">Review submission</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={updating || rev === "Approved"}
              onClick={() => onReview(outlet.id, "approved")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-[11px] font-semibold text-emerald-800 disabled:opacity-50"
            >
              {updating ? <Loader2 size={14} className="mx-auto animate-spin" /> : "Approve"}
            </button>
            <button
              type="button"
              disabled={updating || rev === "Rejected"}
              onClick={() => onReview(outlet.id, "rejected")}
              className="rounded-lg border border-rose-200 bg-rose-50 py-2 text-[11px] font-semibold text-rose-800 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={updating || rev === "Pending"}
              onClick={() => onReview(outlet.id, "pending")}
              className="rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-700 disabled:opacity-50"
            >
              Pending
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-[11px] text-slate-500">Review actions require Company Admin, QA Officer, or Super Admin.</p>
      )}
    </aside>
  );
}

export default function MapViewPage() {
  const [outlets, setOutlets] = React.useState<OutletPoint[]>(OUTLETS);
  const [selectedOutletId, setSelectedOutletId] = React.useState(OUTLETS[0].id);
  const [usingMock, setUsingMock] = React.useState(true);
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  const profile = readUserProfile();
  const canReview = canReviewOutletSubmissions(profile?.role?.slug);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await fetchOutletsApi();
        if (cancelled) {
          return;
        }
        const pts = raw.map(apiOutletToPoint);
        if (pts.length > 0) {
          setOutlets(pts);
          setSelectedOutletId(pts[0].id);
          setUsingMock(false);
        } else {
          setOutlets([]);
          setSelectedOutletId("");
          setUsingMock(false);
        }
      } catch {
        if (!cancelled) {
          setOutlets(OUTLETS);
          setSelectedOutletId(OUTLETS[0].id);
          setUsingMock(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleReview(outletId: string, status: OutletReviewStatus) {
    setUpdatingId(outletId);
    try {
      const updated = await updateOutletStatus(outletId, status);
      const pt = apiOutletToPoint(updated);
      setOutlets((prev) => prev.map((o) => (o.id === pt.id ? pt : o)));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  }

  const stats = React.useMemo(() => buildTypeStats(outlets), [outlets]);
  const outletTypeStats = [
    { title: "Total Outlets", value: stats.total, icon: Store, iconClass: "text-emerald-600 bg-emerald-50" },
    { title: "Pharmacy", value: stats.Pharmacy, icon: MapPin, iconClass: "text-blue-600 bg-blue-50" },
    { title: "Clinic / Dispensary", value: stats["Clinic / Dispensary"], icon: Stethoscope, iconClass: "text-violet-600 bg-violet-50" },
    { title: "Agrovet", value: stats.Agrovet, icon: Leaf, iconClass: "text-amber-600 bg-amber-50" },
    { title: "Shop", value: stats.Shop, icon: ShoppingBag, iconClass: "text-cyan-600 bg-cyan-50" },
    { title: "Hospital", value: stats.Hospital, icon: Hospital, iconClass: "text-rose-600 bg-rose-50" },
  ];

  const selectedOutlet =
    outlets.find((outlet) => outlet.id === selectedOutletId) ?? outlets[0] ?? null;

  return (
    <AdminShell>
      {({ toggleSidebar }) => (
        <>
          <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
                <h1 className="text-[22px] font-bold text-slate-900">Map View</h1>
                <p className="text-[12px] text-slate-500">Explore all collected outlets on the map</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700">
                <MapPin size={14} /> Nairobi County <ChevronDown size={14} className="text-slate-400" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700">
                <Calendar size={14} /> May 1 - May 31, 2026 <ChevronDown size={14} className="text-slate-400" />
              </button>
              <div className="shrink-0">
                <NotificationBell />
              </div>
            </div>
          </header>

          <section className="mt-5 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 xl:grid-cols-6">
            {outletTypeStats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.iconClass}`}>
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-[10px] leading-tight text-slate-500">{item.title}</p>
                      <p className="mt-0.5 text-[28px] leading-none font-bold text-slate-900">{item.value.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {usingMock ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Showing demo map data — API unavailable or no outlets returned.
            </p>
          ) : null}

          <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(0,280px)] xl:grid-cols-[1fr_280px]">
            <OutletMapViewMap
              outlets={outlets}
              selectedOutletId={selectedOutlet?.id ?? ""}
              onSelectOutlet={setSelectedOutletId}
            />
            {selectedOutlet ? (
              <OutletDetailsCard
                outlet={selectedOutlet}
                canReview={canReview}
                updating={updatingId === selectedOutlet.id}
                onReview={handleReview}
              />
            ) : (
              <aside className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                No outlets to display.
              </aside>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}

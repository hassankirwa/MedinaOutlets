"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Calendar,
  ChevronDown,
  Eye,
  MapPin,
  Menu,
  Pencil,
  Store,
  Stethoscope,
  Leaf,
  ShoppingBag,
  Hospital,
  User,
  Phone,
  Loader2,
} from "lucide-react";
import { AdminShell } from "../dashboard/_components/AdminShell";
import { NotificationBell } from "@/components/NotificationBell";
import {
  fetchBranches,
  fetchOutletsApi,
} from "@/lib/api";
import { apiOutletToPoint, type ApiOutletRow } from "@/lib/outletTransform";
import type { OutletPoint } from "@/components/maps/outlet-map-data";
import { isValidGpsCoordinate } from "@/components/maps/map-utils";

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

function OutletDetailsCard({
  outlet,
  detail,
}: {
  outlet: OutletPoint;
  detail?: ApiOutletRow | null;
}) {
  return (
    <aside className="w-full shrink-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm xl:max-w-[320px]">
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
          <span className="text-slate-500">Area / Subcounty</span>
          <p className="mt-1 break-words text-right font-medium">{detail?.suburb ?? "—"}</p>
        </div>
        <div>
          <span className="text-slate-500">Ward</span>
          <p className="mt-1 break-words text-right font-medium">
            {detail?.captured_ward ?? detail?.ward ?? "—"}
          </p>
        </div>
        <div>
          <span className="text-slate-500">County</span>
          <p className="mt-1 break-words text-right font-medium">
            {detail?.captured_county ?? detail?.county ?? "—"}
          </p>
        </div>
        <div>
          <span className="text-slate-500">Landmark</span>
          <p className="mt-1 break-words text-right font-medium">{detail?.raw?.landmark ?? "—"}</p>
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

      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/admin/submissions/${outlet.id}`}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Eye size={13} /> View
        </Link>
        <Link
          href={`/admin/submissions/${outlet.id}?edit=1`}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Pencil size={13} /> Edit
        </Link>
      </div>
    </aside>
  );
}

export default function MapViewPage() {
  const [outlets, setOutlets] = React.useState<OutletPoint[]>([]);
  const [outletDetails, setOutletDetails] = React.useState<ApiOutletRow[]>([]);
  const [selectedOutletId, setSelectedOutletId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [branchFilter, setBranchFilter] = React.useState("");
  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);

  React.useEffect(() => {
    void fetchBranches().then((r) => setBranches(r.branches));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const raw = await fetchOutletsApi(branchFilter ? { branch_id: branchFilter } : undefined);
        if (cancelled) {
          return;
        }
        const pts = raw
          .filter((r) => isValidGpsCoordinate(r.lat, r.lng))
          .map(apiOutletToPoint);
        setOutlets(pts);
        setOutletDetails(raw.filter((r) => pts.some((p) => p.id === r.id)));
        setSelectedOutletId(pts[0]?.id ?? "");
      } catch (e) {
        if (!cancelled) {
          setOutlets([]);
          setOutletDetails([]);
          setSelectedOutletId("");
          setLoadError(e instanceof Error ? e.message : "Could not load outlets");
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
  }, [branchFilter]);

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
  const selectedDetail =
    outletDetails.find((row) => row.id === selectedOutletId) ??
    outletDetails[0] ??
    null;

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
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
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
                      <p className="mt-0.5 text-[28px] leading-none font-bold text-slate-900">
                        {loading ? "—" : item.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {loadError && !loading ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
              {loadError}
            </p>
          ) : null}

          <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            {loading ? (
              <div className="col-span-full flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white text-slate-500">
                <Loader2 size={28} className="animate-spin text-emerald-600" />
                <p className="text-sm">Loading map data…</p>
              </div>
            ) : (
              <>
                <div className="min-w-0">
                  <OutletMapViewMap
                    outlets={outlets}
                    selectedOutletId={selectedOutlet?.id ?? ""}
                    onSelectOutlet={setSelectedOutletId}
                  />
                </div>
                {selectedOutlet ? (
                  <OutletDetailsCard
                    outlet={selectedOutlet}
                    detail={selectedDetail}
                  />
                ) : (
                  <aside className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                    No outlets with GPS coordinates to display.
                  </aside>
                )}
              </>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { fetchProjectOutlets } from "@/lib/api";
import { apiOutletToPoint, type ApiOutletRow } from "@/lib/outletTransform";
import type { OutletPoint } from "@/components/maps/outlet-map-data";
import { isValidGpsCoordinate } from "@/components/maps/map-utils";

const OutletMapViewMap = dynamic(
  () => import("@/components/maps/OutletMapViewMap").then((m) => m.OutletMapViewMap),
  { ssr: false },
);

export function ProjectMapTab({ projectId }: { projectId: number }) {
  const [rows, setRows] = React.useState<ApiOutletRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [countyFilter, setCountyFilter] = React.useState("");
  const [wardFilter, setWardFilter] = React.useState("");
  const [workerFilter, setWorkerFilter] = React.useState("");
  const [selectedOutletId, setSelectedOutletId] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchProjectOutlets(projectId, {
          search: search || undefined,
          captured_county: countyFilter || undefined,
          captured_ward: wardFilter || undefined,
        });
        let data = Array.isArray(res.data) ? res.data : [];
        if (workerFilter) {
          data = data.filter((r) => r.fieldWorker === workerFilter);
        }
        if (!cancelled) {
          setRows(data);
          if (data[0]) setSelectedOutletId(data[0].id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, search, countyFilter, wardFilter, workerFilter]);

  const outlets: OutletPoint[] = rows
    .filter((r) => isValidGpsCoordinate(r.lat, r.lng))
    .map(apiOutletToPoint);
  const selectedRow = rows.find((r) => r.id === selectedOutletId) ?? rows[0] ?? null;
  const workers = [...new Set(rows.map((r) => r.fieldWorker).filter(Boolean))];
  const counties = [...new Set(rows.map((r) => r.captured_county ?? r.county).filter(Boolean))];
  const wards = [...new Set(rows.map((r) => r.captured_ward ?? r.ward).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Search outlet or address" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="rounded-lg border px-3 py-2 text-sm" value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}>
          <option value="">All field workers</option>
          {workers.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={countyFilter} onChange={(e) => setCountyFilter(e.target.value)}>
          <option value="">All captured counties</option>
          {counties.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="rounded-lg border px-3 py-2 text-sm" value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}>
          <option value="">All captured wards</option>
          {wards.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading map…</p>
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="min-w-0 flex-1">
            <OutletMapViewMap outlets={outlets} selectedOutletId={selectedOutletId} onSelectOutlet={setSelectedOutletId} />
          </div>
          {selectedRow && (
            <aside className="w-full shrink-0 rounded-xl border bg-slate-50 p-4 text-sm xl:max-w-[320px]">
              <h3 className="font-semibold text-slate-900">{selectedRow.name}</h3>
              <p className="mt-1 text-slate-600">{selectedRow.branch ?? "—"}</p>
              <p className="mt-2 text-slate-600">{selectedRow.fieldWorker}</p>
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Area / Subcounty</span>
                  <span className="break-words text-right font-medium">{selectedRow.suburb ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Ward</span>
                  <span className="break-words text-right font-medium">
                    {selectedRow.captured_ward ?? selectedRow.ward ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">County</span>
                  <span className="break-words text-right font-medium">
                    {selectedRow.captured_county ?? selectedRow.county ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Landmark</span>
                  <span className="break-words text-right font-medium">{selectedRow.raw?.landmark ?? "—"}</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">Submitted: {selectedRow.submittedAt}</p>
              <Link href={`/admin/projects/${projectId}/submissions/${selectedRow.id}`} className="mt-3 inline-block text-emerald-700 text-xs font-medium">
                View submission
              </Link>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

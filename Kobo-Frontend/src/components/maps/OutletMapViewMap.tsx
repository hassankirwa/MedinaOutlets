"use client";

import * as React from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { OUTLETS, TYPE_COLORS, type OutletPoint, type OutletType } from "@/components/maps/outlet-map-data";

type ClusterPoint = {
  id: string;
  count: number;
  lat: number;
  lng: number;
  targetZoom: number;
};


const CLUSTERS: ClusterPoint[] = [
  { id: "c1", count: 128, lat: -1.286, lng: 36.82, targetZoom: 10 },
  { id: "c2", count: 55, lat: -1.24, lng: 36.88, targetZoom: 10 },
  { id: "c3", count: 42, lat: -1.26, lng: 36.74, targetZoom: 10 },
  { id: "c4", count: 36, lat: -1.31, lng: 36.68, targetZoom: 10 },
  { id: "c5", count: 31, lat: -1.22, lng: 36.79, targetZoom: 10 },
];

function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend(event) {
      onZoomChange(event.target.getZoom());
    },
  });
  return null;
}

function clusterIcon(count: number) {
  return L.divIcon({
    className: "",
    html: `<div style="height:38px;width:38px;border-radius:9999px;background:#22c55e;color:white;font-weight:700;display:flex;align-items:center;justify-content:center;border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,.22);font-size:12px;">${count}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

export function OutletMapViewMap({
  outlets: outletsFromApi,
  selectedOutletId,
  onSelectOutlet,
}: {
  outlets?: OutletPoint[];
  selectedOutletId: string;
  onSelectOutlet: (outletId: string) => void;
}) {
  const [zoom, setZoom] = React.useState(7);
  const fromApi = outletsFromApi !== undefined;
  const outlets =
    fromApi && outletsFromApi.length >= 0 ? outletsFromApi : OUTLETS;
  const showClusters = !fromApi && zoom < 10;
  const mapCenter = React.useMemo((): [number, number] => {
    if (outlets.length > 0) {
      return [outlets[0].lat, outlets[0].lng];
    }
    return [0.3, 37.9];
  }, [outlets]);

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-slate-100">
      <MapContainer key={`${mapCenter[0]},${mapCenter[1]},${outlets.length}`} center={mapCenter} zoom={fromApi && outlets.length > 0 ? 9 : 7} className="h-full w-full">
        <ZoomWatcher onZoomChange={setZoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {showClusters
          ? CLUSTERS.map((cluster) => (
              <Marker
                key={cluster.id}
                position={[cluster.lat, cluster.lng]}
                icon={clusterIcon(cluster.count)}
                eventHandlers={{
                  click(event) {
                    const map = event.target._map as L.Map;
                    map.flyTo([cluster.lat, cluster.lng], cluster.targetZoom, { animate: true });
                  },
                }}
              />
            ))
          : outlets.map((outlet) => (
              <CircleMarker
                key={outlet.id}
                center={[outlet.lat, outlet.lng]}
                radius={10}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: TYPE_COLORS[outlet.type],
                  fillOpacity: outlet.id === selectedOutletId ? 1 : 0.85,
                }}
                eventHandlers={{
                  click() {
                    onSelectOutlet(outlet.id);
                  },
                }}
              />
            ))}
      </MapContainer>

      <div className="pointer-events-auto absolute bottom-4 left-4 z-[500] rounded-xl border border-slate-200 bg-white/95 p-3 text-[11px] text-slate-700 shadow-sm">
        <div className="mb-2 font-semibold text-slate-800">Outlet Type</div>
        <div className="space-y-1.5">
          {(Object.entries(TYPE_COLORS) as [OutletType, string][]).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
          <span className="text-slate-600">Cluster Markers</span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            ON
          </span>
        </div>
      </div>
    </div>
  );
}

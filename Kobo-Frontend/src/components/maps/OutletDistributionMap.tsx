"use client";

import * as React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(L.Marker.prototype as any).options.icon = DefaultIcon;

import type { OutletType } from "@/components/maps/outlet-map-data";
import { FitMapToPoints, isValidGpsCoordinate, MapEmptyState } from "@/components/maps/map-utils";

type MapPoint = {
  id: string;
  name: string;
  type: OutletType;
  lat: number;
  lng: number;
};

function colorForType(type: MapPoint["type"]) {
  switch (type) {
    case "Pharmacy":
      return "#2563eb";
    case "Clinic / Dispensary":
      return "#ec4899";
    case "Agrovet":
      return "#f59e0b";
    case "Shop":
      return "#22c55e";
    case "Hospital":
      return "#ef4444";
    default:
      return "#06b6d4";
  }
}

export function OutletDistributionMap({ points }: { points?: MapPoint[] }) {
  const gpsPoints = React.useMemo(
    () => (points ?? []).filter((p) => isValidGpsCoordinate(p.lat, p.lng)),
    [points],
  );

  if (gpsPoints.length === 0) {
    return (
      <div className="h-[220px] w-full min-[480px]:h-[280px] sm:h-[320px]">
        <MapEmptyState message="No outlets with GPS coordinates yet." />
      </div>
    );
  }

  const initialCenter: [number, number] = [gpsPoints[0].lat, gpsPoints[0].lng];

  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-xl min-[480px]:h-[280px] sm:h-[320px]">
      <MapContainer
        key={gpsPoints.map((p) => p.id).join(",")}
        center={initialCenter}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <FitMapToPoints points={gpsPoints} defaultZoom={13} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {gpsPoints.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={10}
            pathOptions={{
              color: "white",
              weight: 2,
              fillColor: colorForType(p.type),
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{p.name}</div>
                <div className="text-slate-600">{p.type}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute top-3 right-3 rounded-xl border border-slate-200 bg-white/95 p-3 text-[11px] text-slate-700 shadow-sm backdrop-blur">
        <div className="mb-2 text-[12px] font-semibold text-slate-800">Legend</div>
        <div className="space-y-1.5">
          {(
            [
              ["Pharmacy", "#2563eb"],
              ["Clinic / Dispensary", "#ec4899"],
              ["Agrovet", "#f59e0b"],
              ["Shop", "#22c55e"],
              ["Hospital", "#ef4444"],
            ] as const
          ).map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

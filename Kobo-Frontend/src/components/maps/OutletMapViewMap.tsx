"use client";

import * as React from "react";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import { TYPE_COLORS, type OutletPoint, type OutletType } from "@/components/maps/outlet-map-data";
import { FitMapToPoints, isValidGpsCoordinate, MapEmptyState } from "@/components/maps/map-utils";

export function OutletMapViewMap({
  outlets,
  selectedOutletId,
  onSelectOutlet,
}: {
  outlets: OutletPoint[];
  selectedOutletId: string;
  onSelectOutlet: (outletId: string) => void;
}) {
  const gpsOutlets = React.useMemo(
    () => outlets.filter((o) => isValidGpsCoordinate(o.lat, o.lng)),
    [outlets],
  );

  if (gpsOutlets.length === 0) {
    return (
      <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-slate-100">
        <MapEmptyState message="No outlets with GPS coordinates to display on the map." />
      </div>
    );
  }

  const initialCenter: [number, number] = [gpsOutlets[0].lat, gpsOutlets[0].lng];

  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-slate-100">
      <MapContainer
        key={gpsOutlets.map((o) => o.id).join(",")}
        center={initialCenter}
        zoom={12}
        className="h-full w-full"
      >
        <FitMapToPoints points={gpsOutlets} defaultZoom={14} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {gpsOutlets.map((outlet) => (
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
      </div>
    </div>
  );
}

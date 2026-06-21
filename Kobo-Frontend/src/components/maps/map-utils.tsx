"use client";

import * as React from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

export function isValidGpsCoordinate(lat: unknown, lng: unknown): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return Number.isFinite(la) && Number.isFinite(lo) && !(la === 0 && lo === 0);
}

export function FitMapToPoints({
  points,
  defaultZoom = 14,
}: {
  points: { lat: number; lng: number }[];
  defaultZoom?: number;
}) {
  const map = useMap();

  React.useEffect(() => {
    if (points.length === 0) {
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], defaultZoom);
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: defaultZoom });
  }, [map, points, defaultZoom]);

  return null;
}

export function MapEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
      <p>{message}</p>
    </div>
  );
}

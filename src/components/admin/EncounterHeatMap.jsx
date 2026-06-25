import React, { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Round coords to ~100m grid to cluster nearby points
function gridKey(lat, lng, precision = 3) {
  return `${lat.toFixed(precision)},${lng.toFixed(precision)}`;
}

function getCenter(clusters) {
  if (!clusters.length) return [40.7128, -74.006];
  const lat = clusters.reduce((s, c) => s + c.lat, 0) / clusters.length;
  const lng = clusters.reduce((s, c) => s + c.lng, 0) / clusters.length;
  return [lat, lng];
}

export default function EncounterHeatMap({ encounters }) {
  const clusters = useMemo(() => {
    const map = {};
    for (const enc of encounters) {
      for (const loc of (enc.meet_locations || [])) {
        if (!loc.latitude || !loc.longitude) continue;
        const key = gridKey(loc.latitude, loc.longitude);
        if (!map[key]) map[key] = { lat: loc.latitude, lng: loc.longitude, count: 0 };
        map[key].count++;
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [encounters]);

  const maxCount = useMemo(() => clusters.reduce((m, c) => Math.max(m, c.count), 1), [clusters]);
  const center = useMemo(() => getCenter(clusters), [clusters]);

  if (clusters.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-2xl bg-gray-100 text-gray-400 text-sm">
        No encounter location data yet — data appears after users start meeting nearby.
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: 300, borderRadius: 16, zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {clusters.map((c, i) => {
        const intensity = c.count / maxCount; // 0–1
        // Radius: 10–40px based on count
        const radius = 10 + intensity * 30;
        // Color: violet (low) → orange (high)
        const opacity = 0.35 + intensity * 0.5;
        const color = intensity > 0.6 ? "#f97316" : intensity > 0.3 ? "#a855f7" : "#6366f1";
        return (
          <CircleMarker
            key={i}
            center={[c.lat, c.lng]}
            radius={radius}
            pathOptions={{ fillColor: color, color: "white", weight: 1.5, fillOpacity: opacity }}
          >
            <Tooltip direction="top" offset={[0, -radius]} opacity={0.95}>
              <span className="text-xs font-semibold">
                {c.count} encounter{c.count !== 1 ? "s" : ""}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
import React, { useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import UserAvatar from "@/components/shared/UserAvatar";
import { formatDistanceToNow } from "date-fns";

// Compute geographic center of all meeting points
function getCenter(locations) {
  if (!locations || locations.length === 0) return [40.7128, -74.006];
  const lat = locations.reduce((s, l) => s + l.latitude, 0) / locations.length;
  const lng = locations.reduce((s, l) => s + l.longitude, 0) / locations.length;
  return [lat, lng];
}

export default function EncounterMap({ encounters }) {
  // Collect all meet_locations across all encounters, with encounter context
  const allPoints = useMemo(() => {
    const pts = [];
    for (const enc of encounters) {
      for (const loc of (enc.meet_locations || [])) {
        pts.push({ ...loc, enc });
      }
    }
    return pts;
  }, [encounters]);

  const center = useMemo(() => {
    const locs = allPoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
    return getCenter(locs);
  }, [allPoints]);

  // Group consecutive points per encounter as lines
  const polylines = useMemo(() => {
    return encounters
      .map(enc => (enc.meet_locations || []).map(l => [l.latitude, l.longitude]))
      .filter(pts => pts.length > 1);
  }, [encounters]);

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: 260, borderRadius: 16, zIndex: 0 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />

      {/* Lines connecting meeting points per person */}
      {polylines.map((pts, i) => (
        <Polyline key={i} positions={pts} color="#f97316" weight={2} opacity={0.4} dashArray="4 4" />
      ))}

      {/* Dots for each meeting location */}
      {allPoints.map((pt, i) => (
        <CircleMarker
          key={i}
          center={[pt.latitude, pt.longitude]}
          radius={8}
          pathOptions={{ fillColor: "#f97316", color: "#fff", weight: 2, fillOpacity: 0.85 }}
        >
          <Popup>
            <div className="flex items-center gap-2 min-w-[140px]">
              <UserAvatar
                name={pt.enc.encountered_user_name}
                size="sm"
                colorIndex={pt.enc.encountered_user_id?.charCodeAt(0) || 0}
                avatarUrl={pt.enc.encountered_avatar_url}
              />
              <div>
                <p className="font-semibold text-xs">{pt.enc.encountered_user_name || "Someone"}</p>
                <p className="text-[10px] text-gray-500">
                  {pt.timestamp ? formatDistanceToNow(new Date(pt.timestamp), { addSuffix: true }) : ""}
                </p>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeEmojiIcon(emoji, checkedInCount = 0) {
  const badge = checkedInCount > 0
    ? `<div style="position:absolute;top:-6px;right:-6px;background:#10b981;color:white;font-size:9px;font-weight:700;font-family:sans-serif;border-radius:99px;padding:1px 4px;border:1.5px solid white;min-width:14px;text-align:center;">${checkedInCount}</div>`
    : "";
  return L.divIcon({
    html: `<div style="position:relative;display:inline-block;font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}${badge}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

function makeUserIcon() {
  return L.divIcon({
    html: `<div style="width:16px;height:16px;background:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(249,115,22,0.3)"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function HangoutsMap({ hangouts, userLocation, onSelectHangout }) {
  const center = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : [51.505, -0.09];

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ height: 420 }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User's current location */}
        {userLocation && (
          <Marker
            position={[userLocation.latitude, userLocation.longitude]}
            icon={makeUserIcon()}
          >
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* Hangout markers */}
        {hangouts.map((h) => (
          <Marker
            key={h.id}
            position={[h.latitude, h.longitude]}
            icon={makeEmojiIcon(h.emoji || "🎉", (h.checked_in_ids || []).length)}
            eventHandlers={{ click: () => onSelectHangout(h) }}
          >
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold text-sm">{h.emoji} {h.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">by {h.host_name}</p>
                {h.description && <p className="text-xs mt-1">{h.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {(h.attendee_ids || []).length} going · {h.distance?.toFixed(1)}km away
                </p>
                {(h.checked_in_ids || []).length > 0 && (
                  <p className="text-xs font-medium mt-0.5" style={{ color: "#10b981" }}>
                    ✅ {(h.checked_in_ids || []).length} checked in
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
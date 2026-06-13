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

function makeEmojiIcon(emoji) {
  return L.divIcon({
    html: `<div style="font-size:28px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</div>`,
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
            icon={makeEmojiIcon(h.emoji || "🎉")}
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
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
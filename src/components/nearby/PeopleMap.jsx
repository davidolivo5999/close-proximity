import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makePersonPin(isFriend, initials) {
  const bg = isFriend ? "#8b5cf6" : "#f97316";
  const ring = isFriend ? "rgba(139,92,246,0.35)" : "rgba(249,115,22,0.25)";
  return L.divIcon({
    html: `
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:${bg};border:3px solid white;
        box-shadow:0 0 0 4px ${ring},0 2px 8px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
        color:white;font-size:11px;font-weight:700;font-family:sans-serif;
        position:relative;
      ">
        ${initials}
        <div style="
          position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid ${bg};
        "></div>
      </div>`,
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  });
}

function makeYouPin() {
  return L.divIcon({
    html: `<div style="
      width:20px;height:20px;background:#f97316;
      border:3px solid white;border-radius:50%;
      box-shadow:0 0 0 5px rgba(249,115,22,0.3)">
    </div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function PeopleMap({ users, userLocation, friendIds = [] }) {
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

        {/* You */}
        {userLocation && (
          <Marker position={center} icon={makeYouPin()}>
            <Popup><span className="text-xs font-semibold">You are here</span></Popup>
          </Marker>
        )}

        {/* Nearby people */}
        {users.map((u) => {
          const isFriend = friendIds.includes(u.user_id);
          const distStr = u.distance < 1
            ? `${Math.round(u.distance * 1000)}m`
            : `${u.distance.toFixed(1)}km`;
          return (
            <Marker
              key={u.user_id}
              position={[u.latitude, u.longitude]}
              icon={makePersonPin(isFriend, getInitials(u.user_name))}
            >
              <Popup>
                <div className="min-w-[150px] py-0.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    {isFriend && (
                      <span style={{ fontSize: 10, background: "#8b5cf6", color: "white", borderRadius: 99, padding: "1px 6px" }}>
                        Friend
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm leading-tight">{u.user_name || "Nearby user"}</p>
                  {u.bio && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{u.bio}</p>}
                  {u.interests?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1">{u.interests.slice(0, 3).join(" · ")}</p>
                  )}
                  <p className="text-xs font-medium mt-1" style={{ color: isFriend ? "#8b5cf6" : "#f97316" }}>
                    {distStr} away
                  </p>
                  <a
                    href={`/user/${u.user_id}`}
                    style={{ display: "block", marginTop: 6, fontSize: 11, color: "#f97316", fontWeight: 600 }}
                  >
                    View profile →
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-3 bg-background/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow text-xs font-medium pointer-events-none">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#8b5cf6] inline-block" /> Friends
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#f97316] inline-block" /> Others
        </span>
      </div>
    </div>
  );
}
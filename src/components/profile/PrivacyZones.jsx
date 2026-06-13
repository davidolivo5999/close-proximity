import React, { useState } from "react";
import { ShieldCheck, Plus, Trash2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateDistance } from "@/hooks/useLocation";

const RADIUS_OPTIONS = [
  { label: "100 m", value: 100 },
  { label: "250 m", value: 250 },
  { label: "500 m", value: 500 },
  { label: "1 km", value: 1000 },
];

export default function PrivacyZones({ zones = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [zoneName, setZoneName] = useState("");
  const [radius, setRadius] = useState(250);
  const [detecting, setDetecting] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState(null);

  const handleDetectLocation = () => {
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectedCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setDetecting(false);
      },
      () => setDetecting(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAdd = () => {
    if (!zoneName.trim() || !detectedCoords) return;
    const newZone = {
      name: zoneName.trim(),
      latitude: detectedCoords.latitude,
      longitude: detectedCoords.longitude,
      radius_m: radius,
    };
    onChange([...zones, newZone]);
    setZoneName("");
    setDetectedCoords(null);
    setRadius(250);
    setAdding(false);
  };

  const handleDelete = (idx) => {
    onChange(zones.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <Label className="text-sm font-medium">Privacy Zones</Label>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        When you're inside a privacy zone, your location is hidden from others.
      </p>

      {zones.length > 0 && (
        <div className="space-y-2 mb-3">
          {zones.map((z, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{z.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {z.radius_m >= 1000 ? `${z.radius_m / 1000} km` : `${z.radius_m} m`} radius
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(i)}
                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="bg-muted/40 rounded-xl p-3 space-y-3 border border-border">
          <div>
            <Label className="text-xs mb-1 block">Zone name (e.g. Home, Work)</Label>
            <Input
              placeholder="Home"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              className="h-8 text-sm rounded-lg bg-card border-0"
            />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Radius</Label>
            <div className="flex gap-1.5">
              {RADIUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRadius(opt.value)}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    radius === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Location</Label>
            {detectedCoords ? (
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Location captured — {detectedCoords.latitude.toFixed(4)}, {detectedCoords.longitude.toFixed(4)}</span>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs rounded-lg"
                onClick={handleDetectLocation}
                disabled={detecting}
              >
                {detecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                )}
                {detecting ? "Detecting..." : "Use my current location"}
              </Button>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="flex-1 h-8 text-xs rounded-lg"
              onClick={handleAdd}
              disabled={!zoneName.trim() || !detectedCoords}
            >
              Add Zone
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs rounded-lg"
              onClick={() => { setAdding(false); setDetectedCoords(null); setZoneName(""); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-xs text-primary font-medium hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add privacy zone
        </button>
      )}
    </div>
  );
}
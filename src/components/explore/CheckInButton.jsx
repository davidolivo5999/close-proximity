import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CheckInButton({ userId, encounters = [] }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [justCheckedIn, setJustCheckedIn] = useState(false);

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      toast.error("Location not supported by your browser");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const timestamp = new Date().toISOString();
        const newLoc = { latitude, longitude, timestamp };

        try {
          // Add this location to every active encounter as a manual check-in
          if (encounters.length > 0) {
            await Promise.all(
              encounters.map((enc) => {
                const existing = enc.meet_locations || [];
                return base44.entities.Encounter.update(enc.id, {
                  meet_locations: [...existing, newLoc],
                });
              })
            );
          } else {
            // No encounters yet — store as a "solo" check-in on the user's own location record
            const locs = await base44.entities.UserLocation.filter({ user_id: userId });
            if (locs[0]) {
              const existing = locs[0].meet_locations || [];
              await base44.entities.UserLocation.update(locs[0].id, {
                meet_locations: [...existing, newLoc],
              });
            }
          }

          queryClient.invalidateQueries({ queryKey: ["encounters", userId] });
          setJustCheckedIn(true);
          toast.success("Checked in! This spot is saved to your path history.");
          setTimeout(() => setJustCheckedIn(false), 3000);
        } catch (err) {
          toast.error("Failed to save check-in");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        toast.error("Couldn't get your location — please allow location access");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Button
      onClick={handleCheckIn}
      disabled={loading || justCheckedIn}
      variant={justCheckedIn ? "secondary" : "default"}
      className="gap-2 rounded-2xl h-10 text-sm font-semibold"
      style={!justCheckedIn ? { background: "linear-gradient(135deg, #f97316, #ec4899)" } : {}}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : justCheckedIn ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
      {loading ? "Locating…" : justCheckedIn ? "Checked in!" : "Check In Here"}
    </Button>
  );
}
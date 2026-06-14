import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { calculateDistance } from "@/hooks/useLocation";

const PROXIMITY_METERS = 500;

/**
 * Real-time in-app alert when a friend's location updates and they're within 500m.
 * Fires a toast notification immediately — no polling needed.
 */
export function useFriendProximityAlerts({ user, location, friendIds = [] }) {
  const notifiedRecently = useRef(new Set()); // avoid spamming same friend

  useEffect(() => {
    if (!user || !location || friendIds.length === 0) return;

    const unsubscribe = base44.entities.UserLocation.subscribe((event) => {
      const loc = event.data;
      if (!loc || !loc.is_visible) return;
      if (loc.user_id === user.id) return; // ignore own updates
      if (!friendIds.includes(loc.user_id)) return; // only friends

      const dist = calculateDistance(
        location.latitude, location.longitude,
        loc.latitude, loc.longitude
      );

      const distM = dist * 1000;
      if (distM > PROXIMITY_METERS) return;

      // Throttle: only notify once per friend per 10 minutes
      const cooldownKey = `${loc.user_id}`;
      if (notifiedRecently.current.has(cooldownKey)) return;
      notifiedRecently.current.add(cooldownKey);
      setTimeout(() => notifiedRecently.current.delete(cooldownKey), 10 * 60 * 1000);

      const distStr = distM < 1000 ? `${Math.round(distM)}m` : `${(distM / 1000).toFixed(1)}km`;
      toast(`👋 ${loc.user_name || 'A friend'} is nearby!`, {
        description: `They're just ${distStr} away — open the Discover tab to connect`,
        duration: 8000,
      });
    });

    return () => unsubscribe();
  }, [user?.id, location?.latitude, location?.longitude, friendIds.join(',')]);
}
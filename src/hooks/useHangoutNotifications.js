import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { calculateDistance } from "@/hooks/useLocation";

/**
 * Subscribes to Hangout entity changes and shows in-app notifications:
 * - New hangout created within radius → notify all nearby users
 * - Someone joins your hangout → notify the host
 */
export function useHangoutNotifications({ user, location, radiusKm = 50 }) {
  const knownHangouts = useRef(new Map()); // id -> hangout snapshot
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || !location) return;

    const unsubscribe = base44.entities.Hangout.subscribe((event) => {
      const hangout = event.data;
      if (!hangout) return;

      if (event.type === "create") {
        // Skip if already known (shouldn't happen, but guard)
        if (knownHangouts.current.has(hangout.id)) return;
        knownHangouts.current.set(hangout.id, hangout);

        // Don't notify the host themselves
        if (hangout.host_id === user.id) return;

        // Only notify if within radius
        const dist = calculateDistance(
          location.latitude, location.longitude,
          hangout.latitude, hangout.longitude
        );
        if (dist > radiusKm) return;

        const distStr = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
        toast(`${hangout.emoji || "🎉"} New hangout nearby!`, {
          description: `${hangout.host_name} started "${hangout.title}" — ${distStr} away`,
          duration: 6000,
        });
      }

      if (event.type === "update") {
        const prev = knownHangouts.current.get(hangout.id);
        knownHangouts.current.set(hangout.id, hangout);

        // Notify host when a new attendee joins
        if (hangout.host_id !== user.id) return;
        if (!prev) return;

        const prevIds = prev.attendee_ids || [];
        const newIds = hangout.attendee_ids || [];
        const newAttendees = newIds.filter((id) => !prevIds.includes(id));

        newAttendees.forEach((newId) => {
          const idx = newIds.indexOf(newId);
          const name = (hangout.attendee_names || [])[idx] || "Someone";
          toast("👋 Someone joined your hangout!", {
            description: `${name} is coming to "${hangout.title}"`,
            duration: 6000,
          });
        });
      }
    });

    return () => unsubscribe();
  }, [user?.id, location?.latitude, location?.longitude]);

  // Seed initial hangout state so we have a baseline for "update" diffs
  useEffect(() => {
    if (!user || !location || initialized.current) return;
    initialized.current = true;

    base44.entities.Hangout.filter({ is_active: true }).then((hangouts) => {
      hangouts.forEach((h) => knownHangouts.current.set(h.id, h));
    });
  }, [user?.id, location]);
}
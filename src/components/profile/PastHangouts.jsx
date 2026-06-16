import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import UserAvatar from "@/components/shared/UserAvatar";

export default function PastHangouts({ userId }) {
  const { data: pastHangouts = [], isLoading } = useQuery({
    queryKey: ["pastHangouts", userId],
    queryFn: async () => {
      // Hangouts hosted by user
      const hosted = await base44.entities.Hangout.filter({ host_id: userId });
      // Hangouts user attended
      const attended = await base44.entities.Hangout.filter({ attendee_ids: { $in: [userId] } });
      const combined = [...hosted, ...attended];
      // Past = expired or inactive
      return combined
        .filter((h) => !h.is_active || new Date(h.expires_at) < new Date())
        .sort((a, b) => new Date(b.expires_at) - new Date(a.expires_at));
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  if (isLoading) {
    return (
      <div className="mt-6">
        <p className="text-sm font-semibold mb-3">Past Hangouts</p>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (pastHangouts.length === 0) {
    return (
      <div className="mt-6 bg-card rounded-2xl border border-border p-5 text-center">
        <p className="text-2xl mb-2">🎪</p>
        <p className="text-sm font-medium">No past hangouts yet</p>
        <p className="text-xs text-muted-foreground mt-1">Hangouts you host or attend will appear here</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold mb-3">
        Past Hangouts <span className="text-muted-foreground font-normal">({pastHangouts.length})</span>
      </p>
      <div className="space-y-3">
        {pastHangouts.map((h) => {
          const isHost = h.host_id === userId;
          const attendees = h.attendee_names || [];
          const attendeeIds = h.attendee_ids || [];

          return (
            <div
              key={h.id}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl mt-0.5">{h.emoji || "🎉"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">{h.title}</p>
                    {isHost && (
                      <span className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 shrink-0">
                        Host
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {formatDistanceToNow(new Date(h.expires_at), { addSuffix: true })}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {attendees.length} {attendees.length === 1 ? "person" : "people"}
                    </span>
                  </div>

                  {/* People you met */}
                  {attendees.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        {isHost ? "People who came:" : "Met at this hangout:"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attendeeIds.map((id, idx) => {
                          if (!isHost && id === userId) return null;
                          const name = attendees[idx] || "Unknown";
                          return (
                            <div key={id} className="flex items-center gap-1.5 bg-muted/60 rounded-full pl-0.5 pr-3 py-0.5">
                              <UserAvatar name={name} size="sm" colorIndex={id?.charCodeAt(0) || idx} />
                              <span className="text-xs font-medium">{name.split(" ")[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
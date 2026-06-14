import React from "react";
import { Flame, Users, MapPinCheck, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import UserAvatar from "@/components/shared/UserAvatar";

function trendScore(h) {
  return (h.checked_in_ids?.length || 0) * 2 + (h.attendee_ids?.length || 0);
}

export default function TrendingHangouts({ hangouts, onSelect }) {
  const trending = [...hangouts]
    .filter((h) => trendScore(h) > 0)
    .sort((a, b) => trendScore(b) - trendScore(a))
    .slice(0, 5);

  if (trending.length === 0) return null;

  const formatDistance = (d) => {
    if (!d && d !== 0) return null;
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  };

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-orange-500" />
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          Trending Now
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-5 px-5">
        {trending.map((h, i) => (
          <motion.button
            key={h.id}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onSelect?.(h)}
            className="flex-shrink-0 w-44 rounded-2xl border border-border bg-card p-3 text-left hover:shadow-md transition-shadow"
          >
            {/* Rank badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{h.emoji || "📍"}</span>
              <span className="text-[10px] font-bold text-orange-500 bg-orange-500/10 rounded-full px-2 py-0.5">
                #{i + 1}
              </span>
            </div>

            <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 mb-2">
              {h.title}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {(h.attendee_ids?.length || 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {h.attendee_ids.length}
                </span>
              )}
              {(h.checked_in_ids?.length || 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 font-medium">
                  <MapPinCheck className="h-3 w-3" />
                  {h.checked_in_ids.length} here
                </span>
              )}
              {h.distance != null && (
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary" />
                  {formatDistance(h.distance)}
                </span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
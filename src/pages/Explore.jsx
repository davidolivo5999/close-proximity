import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Compass, Clock, Repeat2 } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export default function Explore() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: encounters = [], isLoading } = useQuery({
    queryKey: ["encounters", user?.id],
    queryFn: () => base44.entities.Encounter.filter({ user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const sorted = useMemo(() =>
    [...encounters].sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at)),
    [encounters]
  );

  return (
    <div>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3 safe-area-top">
        <h1 className="text-2xl font-heading font-bold text-foreground">Explore</h1>
        <p className="text-sm text-muted-foreground">People you've crossed paths with</p>
      </div>

      <div className="px-5 pt-4">
        {isLoading && (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Compass className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No encounters yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              As you move around and others are nearby, they'll appear here.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {sorted.map((enc, i) => (
            <motion.button
              key={enc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:shadow-lg transition-shadow duration-300 text-left"
              onClick={() => navigate(`/user/${enc.encountered_user_id}`, {
                state: { from: "/explore", userName: enc.encountered_user_name }
              })}
            >
              <UserAvatar
                name={enc.encountered_user_name}
                size="md"
                colorIndex={enc.encountered_user_id?.charCodeAt(0) || 0}
                avatarUrl={enc.encountered_avatar_url}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{enc.encountered_user_name || "Unknown"}</h3>
                {enc.encountered_bio && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{enc.encountered_bio}</p>
                )}
                {enc.encountered_interests?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {enc.encountered_interests.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs rounded-full py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {enc.last_seen_at ? formatDistanceToNow(new Date(enc.last_seen_at), { addSuffix: true }) : "recently"}
                  </span>
                  {enc.times_seen > 1 && (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Repeat2 className="h-3 w-3" />
                      {enc.times_seen}x nearby
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
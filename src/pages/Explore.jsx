import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Compass, Clock, Repeat2, Globe } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

function UserCard({ name, userId, avatarUrl, bio, interests, meta, index, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:shadow-lg transition-shadow duration-300 text-left"
      onClick={onClick}
    >
      <UserAvatar
        name={name}
        size="md"
        colorIndex={userId?.charCodeAt(0) || 0}
        avatarUrl={avatarUrl}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{name || "Unknown"}</h3>
        {bio && <p className="text-sm text-muted-foreground truncate mt-0.5">{bio}</p>}
        {interests?.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {interests.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs rounded-full py-0">{tag}</Badge>
            ))}
          </div>
        )}
        {meta && <div className="flex items-center gap-3 mt-1.5">{meta}</div>}
      </div>
    </motion.button>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("encountered");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: encounters = [], isLoading: loadingEncounters } = useQuery({
    queryKey: ["encounters", user?.id],
    queryFn: () => base44.entities.Encounter.filter({ user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: allLocations = [], isLoading: loadingAll } = useQuery({
    queryKey: ["allVisibleUsers"],
    queryFn: () => base44.entities.UserLocation.filter({ is_visible: true }),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const sortedEncounters = useMemo(() =>
    [...encounters].sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at)),
    [encounters]
  );

  const encounteredIds = useMemo(() =>
    new Set(encounters.map((e) => e.encountered_user_id)),
    [encounters]
  );

  const undiscovered = useMemo(() =>
    allLocations.filter(
      (u) => u.user_id !== user?.id && !encounteredIds.has(u.user_id)
    ),
    [allLocations, encounteredIds, user?.id]
  );

  const isLoading = loadingEncounters || loadingAll;

  return (
    <div>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3 safe-area-top">
        <h1 className="text-2xl font-heading font-bold text-foreground">Explore</h1>
        <p className="text-sm text-muted-foreground">Discover people around you</p>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 bg-muted rounded-xl p-1">
          <button
            onClick={() => setTab("encountered")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "encountered" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Crossed Paths {sortedEncounters.length > 0 && `(${sortedEncounters.length})`}
          </button>
          <button
            onClick={() => setTab("discover")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "discover" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Discover {undiscovered.length > 0 && `(${undiscovered.length})`}
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-6">
        {isLoading && (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && tab === "encountered" && (
          <>
            {sortedEncounters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Compass className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">No encounters yet</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  As you move around and others are nearby, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEncounters.map((enc, i) => (
                  <UserCard
                    key={enc.id}
                    index={i}
                    name={enc.encountered_user_name}
                    userId={enc.encountered_user_id}
                    avatarUrl={enc.encountered_avatar_url}
                    bio={enc.encountered_bio}
                    interests={enc.encountered_interests}
                    meta={
                      <>
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
                      </>
                    }
                    onClick={() => navigate(`/user/${enc.encountered_user_id}`, {
                      state: { from: "/explore", userName: enc.encountered_user_name }
                    })}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!isLoading && tab === "discover" && (
          <>
            {undiscovered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Globe className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">No new people to discover</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  You've already encountered everyone on the app — check back later!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {undiscovered.map((u, i) => (
                  <UserCard
                    key={u.user_id}
                    index={i}
                    name={u.user_name}
                    userId={u.user_id}
                    avatarUrl={u.avatar_url}
                    bio={u.bio}
                    interests={u.interests}
                    onClick={() => navigate(`/user/${u.user_id}`, {
                      state: { from: "/explore", userName: u.user_name }
                    })}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Compass, Clock, Repeat2, Globe, Heart, Video, Images, MapPin } from "lucide-react";
import EncounterMap from "@/components/explore/EncounterMap";
import UserAvatar from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import PhotoFeedCard from "@/components/explore/PhotoFeedCard";
import CheckInButton from "@/components/explore/CheckInButton";

function UserCard({ name, userId, avatarUrl, bio, interests, meta, index, onClick, photos, videos, likeCounts }) {
  // Sort photos by like count desc, then show up to 3
  const topPhotos = useMemo(() => {
    if (!photos?.length) return [];
    return [...photos]
      .sort((a, b) => (likeCounts?.[b] || 0) - (likeCounts?.[a] || 0))
      .slice(0, 3);
  }, [photos, likeCounts]);

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="w-full bg-card rounded-2xl border border-border hover:shadow-lg transition-shadow duration-300 text-left overflow-hidden"
      onClick={onClick}
    >
      {/* Photo strip */}
      {topPhotos.length > 0 && (
        <div className="flex gap-0.5 h-28">
          {topPhotos.map((url, i) => (
            <div key={i} className={`relative flex-1 overflow-hidden ${i === 0 ? "rounded-tl-2xl" : ""} ${i === topPhotos.length - 1 ? "rounded-tr-2xl" : ""}`}>
              <img src={url} alt="" className="w-full h-full object-cover" />
              {(likeCounts?.[url] || 0) > 0 && (
                <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                  <Heart className="h-2.5 w-2.5 fill-rose-400 text-rose-400" />
                  <span className="text-white text-[10px] font-semibold">{likeCounts[url]}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 p-4">
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
          {videos?.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Video className="h-3 w-3 text-primary" />
              <span className="text-xs text-primary font-medium">{videos.length} video{videos.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export default function Explore() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("feed");

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

  const { data: allLikes = [] } = useQuery({
    queryKey: ["allPhotoLikes"],
    queryFn: () => base44.entities.PhotoLike.list(),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Build a map of photo_url -> like count
  const globalLikeCounts = useMemo(() =>
    allLikes.reduce((acc, l) => {
      acc[l.photo_url] = (acc[l.photo_url] || 0) + 1;
      return acc;
    }, {}),
    [allLikes]
  );

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

  // Build photo feed: all photos from all visible users, each as its own card
  const photoFeed = useMemo(() => {
    const items = [];
    for (const loc of allLocations) {
      if (loc.user_id === user?.id) continue;
      for (const photo of (loc.photos || [])) {
        items.push({ photo, owner: loc });
      }
    }
    // Shuffle by mixing owner order so it feels like a feed
    return items.sort((a, b) => new Date(b.owner.updated_date) - new Date(a.owner.updated_date));
  }, [allLocations, user?.id]);

  const isLoading = loadingEncounters || loadingAll;

  return (
    <div>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3 safe-area-top">
        <h1 className="text-2xl font-heading font-bold text-foreground">Explore</h1>
        <p className="text-sm text-muted-foreground">Discover people around you</p>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 bg-muted rounded-xl p-1">
          <button
            onClick={() => setTab("feed")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 ${tab === "feed" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            <Images className="h-3.5 w-3.5" /> Feed
          </button>
          <button
            onClick={() => setTab("encountered")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "encountered" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Paths {sortedEncounters.length > 0 && `(${sortedEncounters.length})`}
          </button>
          <button
            onClick={() => setTab("discover")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === "discover" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Discover
          </button>
        </div>
      </div>

      <div className={tab === "feed" ? "" : "px-5 pt-4 pb-6"}>
        {isLoading && (
          <div className="space-y-3 mt-2 px-5 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* PHOTO FEED TAB */}
        {!isLoading && tab === "feed" && (
          <>
            {photoFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-5">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Images className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-semibold mb-2">No photos yet</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Photos from people nearby will show up here.
                </p>
              </div>
            ) : (
              <div>
                {photoFeed.map(({ photo, owner }, i) => (
                  <PhotoFeedCard
                    key={`${owner.user_id}-${i}`}
                    photo={photo}
                    owner={owner}
                    currentUser={user}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!isLoading && tab === "encountered" && (
          <>
            {/* Check In button */}
            {user && (
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Mark this spot</p>
                  <p className="text-xs text-muted-foreground">Save your current location to your path history</p>
                </div>
                <CheckInButton userId={user.id} encounters={sortedEncounters} />
              </div>
            )}

            {/* Meeting history map */}
            {sortedEncounters.some(e => (e.meet_locations || []).length > 0) && (
              <div className="px-5 pt-2 pb-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Where you've crossed paths</p>
                </div>
                <EncounterMap encounters={sortedEncounters} />
              </div>
            )}

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
                {sortedEncounters.map((enc, i) => {
                  const locData = allLocations.find(l => l.user_id === enc.encountered_user_id);
                  return (
                  <UserCard
                    key={enc.id}
                    index={i}
                    name={enc.encountered_user_name}
                    userId={enc.encountered_user_id}
                    avatarUrl={enc.encountered_avatar_url}
                    bio={enc.encountered_bio}
                    interests={enc.encountered_interests}
                    photos={locData?.photos}
                    videos={locData?.videos}
                    likeCounts={globalLikeCounts}
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
                        {(enc.meet_locations || []).length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {enc.meet_locations.length} {enc.meet_locations.length === 1 ? "spot" : "spots"}
                          </span>
                        )}
                      </>
                    }
                    onClick={() => navigate(`/user/${enc.encountered_user_id}`, {
                      state: { from: "/explore", userName: enc.encountered_user_name }
                    })}
                  />
                  );
                })}
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
                    photos={u.photos}
                    videos={u.videos}
                    likeCounts={globalLikeCounts}
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
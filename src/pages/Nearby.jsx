import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Radar, MapPinOff, RefreshCw, Plus, Map, List, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PulseRadar from "@/components/shared/PulseRadar";
import NearbyUserCard from "@/components/nearby/NearbyUserCard";
import HangoutCard from "@/components/hangouts/HangoutCard";
import CreateHangoutDialog from "@/components/hangouts/CreateHangoutDialog";
import { useUserLocation, calculateDistance } from "@/hooks/useLocation";
import NearbyFilters from "@/components/nearby/NearbyFilters";
import PeopleMap from "@/components/nearby/PeopleMap";
import { useHangoutNotifications } from "@/hooks/useHangoutNotifications";
import { useFriendProximityAlerts } from "@/hooks/useFriendProximityAlerts";
import HangoutsMap from "@/components/hangouts/HangoutsMap";
import TrendingHangouts from "@/components/hangouts/TrendingHangouts";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { isAdmin } from "@/lib/roleCheck";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const RADIUS_KM = 50;

export default function Nearby() {
  const [isScanning, setIsScanning] = useState(false);
  const [showCreateHangout, setShowCreateHangout] = useState(false);
  const [sortBy, setSortBy] = useState("distance");
  const [activeInterest, setActiveInterest] = useState(null);
  const [hangoutsView, setHangoutsView] = useState("list");
  const [peopleView, setPeopleView] = useState("list");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch user's own location record — pick the most recently updated one and delete duplicates
  const { data: myLocationRecord } = useQuery({
    queryKey: ["myLocation", user?.id],
    queryFn: async () => {
      const locs = await base44.entities.UserLocation.filter({ user_id: user.id });
      if (locs.length === 0) return null;
      // Sort by updated_date descending, prefer records with photos/avatar
      const sorted = [...locs].sort((a, b) => {
        const aScore = (a.photos?.length || 0) + (a.avatar_url ? 10 : 0);
        const bScore = (b.photos?.length || 0) + (b.avatar_url ? 10 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return new Date(b.updated_date) - new Date(a.updated_date);
      });
      const primary = sorted[0];
      // Delete all duplicates silently
      for (const dup of sorted.slice(1)) {
        base44.entities.UserLocation.delete(dup.id).catch(() => {});
      }
      return primary;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const privacyZones = myLocationRecord?.privacy_zones || [];

  const { location, error: locError, loading: locLoading, insideZone, requestLocation } =
    useUserLocation(privacyZones);

  // Keep a ref to myLocationRecord so the broadcast effect can access it
  // without it being a dependency (avoids re-firing on every refetch)
  const myLocationRecordRef = useRef(myLocationRecord);
  useEffect(() => { myLocationRecordRef.current = myLocationRecord; }, [myLocationRecord]);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Broadcast own location — add debounce to avoid multiple updates (only for authenticated users)
  useEffect(() => {
    const user = userRef.current;
    if (!user?.id) return;

    if (!location) {
      const rec = myLocationRecordRef.current;
      if (insideZone && rec) {
        base44.entities.UserLocation.update(rec.id, { is_visible: false }).catch(() => {});
      }
      return;
    }

    const timeout = setTimeout(async () => {
      const rec = myLocationRecordRef.current;
      const data = {
        user_id: user.id,
        user_name: rec?.user_name || user.full_name || "",
        latitude: location.latitude,
        longitude: location.longitude,
        is_visible: true,
        // Cancel any pending deletion when user logs back in
        ...(rec?.deletion_scheduled_at ? { deletion_scheduled_at: null } : {}),
      };
      try {
        if (rec) {
          await base44.entities.UserLocation.update(rec.id, data);
        } else {
          await base44.entities.UserLocation.create(data);
          queryClient.invalidateQueries({ queryKey: ["myLocation", user.id] });
        }
      } catch {
        await base44.entities.UserLocation.create(data);
        queryClient.invalidateQueries({ queryKey: ["myLocation", user.id] });
      }
    }, 500);

    return () => clearTimeout(timeout);
  // Only re-broadcast when coords or zone actually change — NOT on object refetch
  }, [location?.latitude, location?.longitude, insideZone]);

  const { data: allLocations = [], refetch: refetchLocations } = useQuery({
    queryKey: ["nearbyUsers"],
    queryFn: () => base44.entities.UserLocation.filter({ is_visible: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: allHangouts = [], refetch: refetchHangouts } = useQuery({
    queryKey: ["hangouts"],
    queryFn: () => base44.entities.Hangout.filter({ is_active: true }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: myBlocks = [] } = useQuery({
    queryKey: ["blocks", user?.id],
    queryFn: async () => {
      const [blocked, blockedBy] = await Promise.all([
        base44.entities.Block.filter({ blocker_id: user.id }),
        base44.entities.Block.filter({ blocked_id: user.id }),
      ]);
      return [...blocked.map((b) => b.blocked_id), ...blockedBy.map((b) => b.blocker_id)];
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ["myRequests", user?.id],
    queryFn: async () => {
      const [sent, received] = await Promise.all([
        base44.entities.FriendRequest.filter({ from_user_id: user.id }),
        base44.entities.FriendRequest.filter({ to_user_id: user.id }),
      ]);
      return [...sent, ...received];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const getRequestStatus = (otherUserId) => {
    const req = myRequests.find(
      (r) =>
        (r.from_user_id === user?.id && r.to_user_id === otherUserId) ||
        (r.to_user_id === user?.id && r.from_user_id === otherUserId)
    );
    return req?.status || null;
  };

  const nearbyUsers = allLocations
    .filter((u) => u.user_id !== user?.id)
    .filter((u) => !myBlocks.includes(u.user_id))
    .filter((u, idx, arr) => arr.findIndex(x => x.user_id === u.user_id) === idx)
    .map((u) => ({
      ...u,
      distance: location ? calculateDistance(
        location.latitude, location.longitude,
        u.latitude, u.longitude
      ) : null,
    }))
    .filter((u) => !location || u.distance <= RADIUS_KM)
    .filter((u) => !activeInterest || (u.interests || []).includes(activeInterest))
    .sort((a, b) => {
      if (!location) return (a.user_name || "").localeCompare(b.user_name || "");
      return sortBy === "name"
        ? (a.user_name || "").localeCompare(b.user_name || "")
        : a.distance - b.distance;
    });

  const nearbyHangouts = allHangouts
    .filter((h) => new Date(h.expires_at) > new Date())
    .map((h) => ({
      ...h,
      distance: location ? calculateDistance(
        location.latitude, location.longitude,
        h.latitude, h.longitude
      ) : null,
    }))
    .filter((h) => !location || h.distance <= RADIUS_KM)
    .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at));

  const sendRequest = useMutation({
    mutationFn: async (targetUser) => {
      if (!isAdmin(user)) throw new Error("Only the app admin can send requests");
      return base44.entities.FriendRequest.create({
        from_user_id: user.id,
        to_user_id: targetUser.user_id,
        from_user_name: user.full_name,
        to_user_name: targetUser.user_name,
        status: "pending",
      });
    },
    onSuccess: () => {
      toast.success("Friend request sent!");
      queryClient.invalidateQueries({ queryKey: ["myRequests"] });
    },
    onError: () => {
      toast.error("Only the app admin can send requests");
    },
  });

  const createHangout = useMutation({
    mutationFn: async ({ title, description, emoji, duration_hours }) => {
      if (!isAdmin(user)) throw new Error("Only the app admin can create hangouts");
      const expiresAt = new Date(Date.now() + duration_hours * 3600 * 1000).toISOString();
      return base44.entities.Hangout.create({
        host_id: user.id,
        host_name: myLocationRecord?.user_name || user.full_name,
        title,
        description,
        emoji,
        latitude: location.latitude,
        longitude: location.longitude,
        expires_at: expiresAt,
        duration_hours,
        attendee_ids: [],
        attendee_names: [],
        is_active: true,
      });
    },
    onSuccess: () => {
      toast.success("Hangout created! Friends nearby can see it.");
      setShowCreateHangout(false);
      queryClient.invalidateQueries({ queryKey: ["hangouts"] });
    },
    onError: () => {
      toast.error("Only the app admin can create hangouts");
    },
  });

  const rsvpHangout = useMutation({
    mutationFn: async (hangout) => {
      if (!user?.id) {
        toast.error("Sign in to RSVP to hangouts");
        return;
      }
      const ids = [...(hangout.attendee_ids || []), user.id];
      const names = [...(hangout.attendee_names || []), myLocationRecord?.user_name || user.full_name];
      return base44.entities.Hangout.update(hangout.id, {
        attendee_ids: ids,
        attendee_names: names,
      });
    },
    onSuccess: () => {
      toast.success("You're going! 🎉");
      queryClient.invalidateQueries({ queryKey: ["hangouts"] });
    },
  });

  const deleteHangout = useMutation({
    mutationFn: (hangout) =>
      base44.entities.Hangout.update(hangout.id, { is_active: false }),
    onSuccess: () => {
      toast("Hangout cancelled.");
      queryClient.invalidateQueries({ queryKey: ["hangouts"] });
    },
  });

  const checkInHangout = useMutation({
    mutationFn: async (hangout) => {
      if (!user?.id) {
        toast.error("Sign in to check in to hangouts");
        return;
      }
      const ids = [...new Set([...(hangout.checked_in_ids || []), user.id])];
      return base44.entities.Hangout.update(hangout.id, { checked_in_ids: ids });
    },
    onSuccess: () => {
      toast.success("You've checked in! 📍");
      queryClient.invalidateQueries({ queryKey: ["hangouts"] });
    },
  });

  useHangoutNotifications({ user, location });

  // Track encounters — record people seen nearby
  const encounterCooldownRef = useRef({});
  useEffect(() => {
    if (!user?.id || !location || nearbyUsers.length === 0) return;
    const COOLDOWN_MS = 10 * 60 * 1000; // 10 min cooldown per person
    const now = Date.now();

    nearbyUsers.forEach(async (nu) => {
      const lastRecorded = encounterCooldownRef.current[nu.user_id];
      if (lastRecorded && now - lastRecorded < COOLDOWN_MS) return;
      encounterCooldownRef.current[nu.user_id] = now;

      const existing = await base44.entities.Encounter.filter({
        user_id: user.id,
        encountered_user_id: nu.user_id,
      });

      const nowIso = new Date().toISOString();
      const meetPoint = { latitude: location.latitude, longitude: location.longitude, timestamp: nowIso };

      if (existing.length > 0) {
        const prevLocations = existing[0].meet_locations || [];
        // Keep last 50 meeting locations to cap record size
        const updatedLocations = [...prevLocations, meetPoint].slice(-50);
        base44.entities.Encounter.update(existing[0].id, {
          last_seen_at: nowIso,
          times_seen: (existing[0].times_seen || 1) + 1,
          encountered_user_name: nu.user_name,
          encountered_avatar_url: nu.avatar_url || null,
          encountered_bio: nu.bio || null,
          encountered_interests: nu.interests || [],
          meet_locations: updatedLocations,
        }).catch(() => {});
      } else {
        base44.entities.Encounter.create({
          user_id: user.id,
          encountered_user_id: nu.user_id,
          encountered_user_name: nu.user_name,
          encountered_avatar_url: nu.avatar_url || null,
          encountered_bio: nu.bio || null,
          encountered_interests: nu.interests || [],
          last_seen_at: nowIso,
          times_seen: 1,
          meet_locations: [meetPoint],
        }).catch(() => {});
      }
    });
  }, [nearbyUsers.length, location?.latitude, location?.longitude]);

  // Derive accepted friend IDs for proximity alerts
  const friendIds = myRequests
    .filter((r) => r.status === "accepted")
    .map((r) => r.from_user_id === user?.id ? r.to_user_id : r.from_user_id);

  useFriendProximityAlerts({ user, location, friendIds });

  const handleScan = useCallback(() => {
    setIsScanning(true);
    requestLocation();
    setTimeout(() => {
      refetchLocations();
      refetchHangouts();
      setIsScanning(false);
    }, 2500);
  }, [requestLocation, refetchLocations, refetchHangouts]);

  useEffect(() => {
    // Only scan if we genuinely have no location yet; don't refetch on every mount
    if (!location && !locLoading && !insideZone) {
      handleScan();
    }
  }, []);

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3 flex items-center justify-between safe-area-top">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Discover</h1>
          <p className="text-sm text-muted-foreground">People &amp; hangouts nearby</p>
        </div>
        <div className="flex items-center gap-2">
          {location && isAdmin(user) && (
            <Button
              size="sm"
              className="rounded-full gap-1.5 px-4 shadow-md shadow-primary/20"
              onClick={() => setShowCreateHangout(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Hangout
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10"
            onClick={handleScan}
            disabled={isScanning || locLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <PullToRefresh onRefresh={async () => { await Promise.all([refetchLocations(), refetchHangouts()]); }}>
        <div className="px-5 pt-3">
          {/* Location permission banner */}
          {locError && !isScanning && (
            <div className="flex flex-col gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-4">
              <div className="flex items-center gap-2">
                <MapPinOff className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-primary font-medium">Location access is blocked</p>
              </div>
              <p className="text-xs text-primary/80">
                To fix this, open your device <strong>Settings → Privacy → Location Services</strong> and allow location for this app, then reload the page.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full px-4 w-fit border-primary/30 text-primary"
                onClick={() => window.location.reload()}
              >
                Reload after enabling
              </Button>
            </div>
          )}

          {/* Privacy zone banner */}
          {insideZone && !isScanning && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-4">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-primary font-medium">
                Privacy zone active — <span className="font-semibold">{insideZone}</span>. Your location is hidden.
              </p>
            </div>
          )}

          {isScanning && <PulseRadar isScanning={true} />}

          {!isScanning && (
            <div className="mt-4 space-y-6">

              {/* Trending section */}
              <TrendingHangouts hangouts={nearbyHangouts} />

              {/* Hangouts section */}
              {nearbyHangouts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                      🔥 Active Hangouts — {nearbyHangouts.length}
                    </p>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                      <button
                        onClick={() => setHangoutsView("list")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          hangoutsView === "list"
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <List className="h-3 w-3" /> List
                      </button>
                      <button
                        onClick={() => setHangoutsView("map")}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          hangoutsView === "map"
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Map className="h-3 w-3" /> Map
                      </button>
                    </div>
                  </div>

                  {hangoutsView === "map" ? (
                    <HangoutsMap
                      hangouts={nearbyHangouts}
                      userLocation={location}
                      onSelectHangout={() => {}}
                    />
                  ) : (
                    <div className="space-y-3">
                      <AnimatePresence>
                        {nearbyHangouts.map((h, i) => (
                          <HangoutCard
                            key={h.id}
                            hangout={h}
                            distance={h.distance}
                            currentUserId={user?.id}
                            currentUser={user}
                            index={i}
                            onRsvp={(h) => rsvpHangout.mutate(h)}
                            onDelete={(h) => deleteHangout.mutate(h)}
                            onCheckIn={(h) => checkInHangout.mutate(h)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </section>
              )}

              {/* People section */}
              <section>
                <NearbyFilters
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  activeInterest={activeInterest}
                  setActiveInterest={setActiveInterest}
                  matchCount={nearbyUsers.length}
                />

                {nearbyUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Radar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">No one nearby</h2>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Nobody within {RADIUS_KM}km right now — but you can still drop a hangout!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                        👥 People nearby — {nearbyUsers.length}
                      </p>
                      <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                        <button
                          onClick={() => setPeopleView("list")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            peopleView === "list"
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <List className="h-3 w-3" /> List
                        </button>
                        <button
                          onClick={() => setPeopleView("map")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            peopleView === "map"
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Map className="h-3 w-3" /> Map
                        </button>
                      </div>
                    </div>

                    {peopleView === "map" ? (
                      <div className="relative">
                        <PeopleMap
                          users={nearbyUsers}
                          userLocation={location}
                          friendIds={friendIds}
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence>
                          {nearbyUsers.map((nu) => (
                            <NearbyUserCard
                              key={nu.user_id}
                              user={nu}
                              distance={nu.distance}
                              requestStatus={getRequestStatus(nu.user_id)}
                              onSendRequest={() => sendRequest.mutate(nu)}
                              currentUserId={user?.id}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          <CreateHangoutDialog
            open={showCreateHangout}
            onClose={() => setShowCreateHangout(false)}
            onSubmit={(data) => createHangout.mutate(data)}
            isLoading={createHangout.isPending}
          />
        </div>
      </PullToRefresh>
    </div>
  );
}
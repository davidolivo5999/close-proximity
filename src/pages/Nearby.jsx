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

  // Broadcast own location — deps are ONLY the coords + insideZone so we
  // never re-fire just because the query returned a new object reference.
  useEffect(() => {
    const user = userRef.current;
    if (!user) return;

    if (!location) {
      const rec = myLocationRecordRef.current;
      if (insideZone && rec) {
        base44.entities.UserLocation.update(rec.id, { is_visible: false }).catch(() => {});
      }
      return;
    }

    const broadcast = async () => {
      const rec = myLocationRecordRef.current;
      const data = {
        user_id: user.id,
        user_name: user.full_name || "",
        latitude: location.latitude,
        longitude: location.longitude,
        is_visible: true,
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
    };
    broadcast();
  // Only re-broadcast when coords or zone actually change — NOT on object refetch
  }, [location?.latitude, location?.longitude, insideZone]);

  const { data: allLocations = [], refetch: refetchLocations } = useQuery({
    queryKey: ["nearbyUsers"],
    queryFn: () => base44.entities.UserLocation.filter({ is_visible: true }),
    enabled: !!location,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: allHangouts = [], refetch: refetchHangouts } = useQuery({
    queryKey: ["hangouts"],
    queryFn: () => base44.entities.Hangout.filter({ is_active: true }),
    enabled: !!location,
    staleTime: 30 * 60 * 1000,
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
    staleTime: 5 * 60 * 1000,
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
    staleTime: 2 * 60 * 1000,
  });

  const getRequestStatus = (otherUserId) => {
    const req = myRequests.find(
      (r) =>
        (r.from_user_id === user?.id && r.to_user_id === otherUserId) ||
        (r.to_user_id === user?.id && r.from_user_id === otherUserId)
    );
    return req?.status || null;
  };

  const nearbyUsers = location
    ? allLocations
        .filter((u) => u.user_id !== user?.id)
        .filter((u) => !myBlocks.includes(u.user_id))
        .filter((u, idx, arr) => arr.findIndex(x => x.user_id === u.user_id) === idx)
        .map((u) => ({
          ...u,
          distance: calculateDistance(
            location.latitude, location.longitude,
            u.latitude, u.longitude
          ),
        }))
        .filter((u) => u.distance <= RADIUS_KM)
        .filter((u) => !activeInterest || (u.interests || []).includes(activeInterest))
        .sort((a, b) =>
          sortBy === "name"
            ? (a.user_name || "").localeCompare(b.user_name || "")
            : a.distance - b.distance
        )
    : [];

  const nearbyHangouts = location
    ? allHangouts
        .filter((h) => new Date(h.expires_at) > new Date())
        .map((h) => ({
          ...h,
          distance: calculateDistance(
            location.latitude, location.longitude,
            h.latitude, h.longitude
          ),
        }))
        .filter((h) => h.distance <= RADIUS_KM)
        .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
    : [];

  const sendRequest = useMutation({
    mutationFn: async (targetUser) =>
      base44.entities.FriendRequest.create({
        from_user_id: user.id,
        to_user_id: targetUser.user_id,
        from_user_name: user.full_name,
        to_user_name: targetUser.user_name,
        status: "pending",
      }),
    onSuccess: () => {
      toast.success("Friend request sent!");
      queryClient.invalidateQueries({ queryKey: ["myRequests"] });
    },
  });

  const createHangout = useMutation({
    mutationFn: async ({ title, description, emoji, duration_hours }) => {
      const expiresAt = new Date(Date.now() + duration_hours * 3600 * 1000).toISOString();
      return base44.entities.Hangout.create({
        host_id: user.id,
        host_name: user.full_name,
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
  });

  const rsvpHangout = useMutation({
    mutationFn: async (hangout) => {
      const ids = [...(hangout.attendee_ids || []), user.id];
      const names = [...(hangout.attendee_names || []), user.full_name];
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
      const ids = [...new Set([...(hangout.checked_in_ids || []), user.id])];
      return base44.entities.Hangout.update(hangout.id, { checked_in_ids: ids });
    },
    onSuccess: () => {
      toast.success("You've checked in! 📍");
      queryClient.invalidateQueries({ queryKey: ["hangouts"] });
    },
  });

  useHangoutNotifications({ user, location });

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
          {location && (
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
          {/* Privacy zone banner */}
          {insideZone && !isScanning && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-4">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-primary font-medium">
                Privacy zone active — <span className="font-semibold">{insideZone}</span>. Your location is hidden.
              </p>
            </div>
          )}

          {/* No location */}
          {!location && !isScanning && !insideZone && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <MapPinOff className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Location Required</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                {locError || "Enable location access to discover people around you"}
              </p>
              <Button onClick={handleScan} className="rounded-full px-8">
                <Radar className="h-4 w-4 mr-2" /> Enable &amp; Scan
              </Button>
            </div>
          )}

          {isScanning && <PulseRadar isScanning={true} />}

          {location && !isScanning && (
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
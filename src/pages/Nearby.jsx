import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Radar, MapPinOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PulseRadar from "@/components/shared/PulseRadar";
import NearbyUserCard from "@/components/nearby/NearbyUserCard";
import { useUserLocation, calculateDistance } from "@/hooks/useLocation";

const RADIUS_KM = 50;

export default function Nearby() {
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();
  const { location, error: locError, loading: locLoading, requestLocation } = useUserLocation();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  // Broadcast own location
  useEffect(() => {
    if (!location || !user) return;

    const broadcast = async () => {
      const existing = await base44.entities.UserLocation.filter({ user_id: user.id });
      const data = {
        user_id: user.id,
        user_name: user.full_name,
        latitude: location.latitude,
        longitude: location.longitude,
        is_visible: true,
      };
      if (existing.length > 0) {
        await base44.entities.UserLocation.update(existing[0].id, data);
      } else {
        await base44.entities.UserLocation.create(data);
      }
    };
    broadcast();
  }, [location, user]);

  // Get all visible locations
  const { data: allLocations = [], refetch: refetchLocations } = useQuery({
    queryKey: ["nearbyUsers"],
    queryFn: () => base44.entities.UserLocation.filter({ is_visible: true }),
    enabled: !!location,
    refetchInterval: 15000,
  });

  // Get friend requests I sent or received
  const { data: myRequests = [] } = useQuery({
    queryKey: ["myRequests", user?.id],
    queryFn: async () => {
      const sent = await base44.entities.FriendRequest.filter({ from_user_id: user.id });
      const received = await base44.entities.FriendRequest.filter({ to_user_id: user.id });
      return [...sent, ...received];
    },
    enabled: !!user?.id,
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
        .map((u) => ({
          ...u,
          distance: calculateDistance(
            location.latitude,
            location.longitude,
            u.latitude,
            u.longitude
          ),
        }))
        .filter((u) => u.distance <= RADIUS_KM)
        .sort((a, b) => a.distance - b.distance)
    : [];

  const sendRequest = useMutation({
    mutationFn: async (targetUser) => {
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
  });

  const handleScan = useCallback(() => {
    setIsScanning(true);
    requestLocation();
    setTimeout(() => {
      refetchLocations();
      setIsScanning(false);
    }, 2500);
  }, [requestLocation, refetchLocations]);

  useEffect(() => {
    if (!location) {
      handleScan();
    }
  }, []);

  return (
    <div className="px-5 pt-14">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Discover</h1>
          <p className="text-sm text-muted-foreground mt-0.5">People nearby right now</p>
        </div>
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

      {!location && !isScanning && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <MapPinOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Location Required</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            {locError || "Enable location access to discover people around you"}
          </p>
          <Button onClick={handleScan} className="rounded-full px-8">
            <Radar className="h-4 w-4 mr-2" /> Enable & Scan
          </Button>
        </div>
      )}

      {isScanning && <PulseRadar isScanning={true} />}

      {location && !isScanning && (
        <div className="space-y-3 mt-6">
          {nearbyUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Radar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">No one nearby</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                There's nobody within {RADIUS_KM}km right now. Try again later!
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">
                {nearbyUsers.length} {nearbyUsers.length === 1 ? "person" : "people"} nearby
              </p>
              <AnimatePresence>
                {nearbyUsers.map((nu) => (
                  <NearbyUserCard
                    key={nu.user_id}
                    user={nu}
                    distance={nu.distance}
                    requestStatus={getRequestStatus(nu.user_id)}
                    onSendRequest={() => sendRequest.mutate(nu)}
                  />
                ))}
              </AnimatePresence>
            </>
          )}
        </div>
      )}
    </div>
  );
}
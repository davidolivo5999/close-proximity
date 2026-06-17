import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ShieldOff, MessageCircle } from "lucide-react";
import PhotoGridLightbox from "@/components/profile/PhotoGridLightbox";
import PhotoFeedCard from "@/components/explore/PhotoFeedCard";
import { PROFILE_THEMES } from "@/components/profile/ProfileThemePicker";
import UserAvatar from "@/components/shared/UserAvatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const backTo = location.state?.from || "/";
  const backTab = location.state?.from || "/";

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });



  const { data: locationData, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      const results = await base44.entities.UserLocation.filter({ user_id: userId });
      return results[0] || null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const distance = location.state?.distance ?? null;
  const formatDistance = (d) => {
    if (d == null) return null;
    if (d < 1) return `${Math.round(d * 1000)}m away`;
    return `${d.toFixed(1)}km away`;
  };

  const handleBlock = async () => {
    await base44.entities.Block.create({ blocker_id: currentUser.id, blocked_id: userId });
    queryClient.invalidateQueries({ queryKey: ["blocks"] });
    toast.success("User blocked.");
    navigate(backTo, { replace: true, state: { __tab: backTab } });
  };

  const userName = locationData?.user_name || location.state?.userName || "VibeCheck User";
  const theme = PROFILE_THEMES.find(t => t.id === locationData?.profile_theme) || PROFILE_THEMES[0];
  const canInteract = currentUser && currentUser.id !== userId;

  return (
    <div className="min-h-full bg-background">
      {/* Hero Banner */}
      <div className={`relative bg-gradient-to-br ${theme.gradient} pt-safe`}>
        {locationData?.banner_url && (
          <img src={locationData.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
        )}
        <div className="relative z-10">
          {/* Back button */}
          <button
            onClick={() => navigate(backTo, { state: { __tab: backTab } })}
            className="flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors px-5 pt-4 pb-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center px-5 pt-4 pb-8">
            <div className="ring-4 ring-white/30 rounded-full shadow-2xl">
              <UserAvatar
                name={userName}
                size="xl"
                colorIndex={userId?.charCodeAt(0) || 0}
                avatarUrl={locationData?.avatar_url}
              />
            </div>
            <h1 className="text-2xl font-heading font-bold mt-3 text-white drop-shadow">{userName}</h1>
            {distance != null && (
              <div className="flex items-center gap-1 text-sm text-white/70 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{formatDistance(distance)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons pinned just below hero */}
      {canInteract && (
        <div className="px-5 -mt-5 mb-4 flex gap-3 relative z-20">
          <Button
            className="flex-1 rounded-2xl shadow-md gap-2"
            onClick={() => navigate(`/messages/${userId}`, { state: { peerName: userName, peerAvatarUrl: locationData?.avatar_url } })}
          >
            <MessageCircle className="h-4 w-4" /> Message
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-2xl shadow-md h-9 w-10 flex-shrink-0">
                <ShieldOff className="h-4 w-4 text-destructive/60" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Block {userName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  They won't appear in your Discover feed and you won't appear in theirs.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBlock} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Block
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Body */}
      <div className="px-5 pb-10 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && locationData && (
          <>
            {/* Bio */}
            {locationData.bio && (
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">About</p>
                <p className="text-sm text-foreground leading-relaxed">{locationData.bio}</p>
              </div>
            )}

            {/* Interests */}
            {locationData.interests?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Interests</p>
                <div className="flex flex-wrap gap-1.5">
                  {locationData.interests.map((tag) => (
                    <Badge key={tag} variant="secondary" className="rounded-full text-xs px-3 py-1">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Photos — grid with tap to expand */}
            {locationData.photos?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-4 pb-3">
                  Photos · {locationData.photos.length}
                </p>
                <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-0.5">
                  {locationData.photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxPhoto(url)}
                      className="relative aspect-square overflow-hidden bg-muted"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Videos — inline player + reactions */}
            {locationData.videos?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-4 pb-1">
                  Videos · {locationData.videos.length}
                </p>
                {locationData.videos.map((url, i) => (
                  <div key={i} className={i > 0 ? "border-t border-border/50" : ""}>
                    <video src={url} controls className="w-full max-h-72 bg-black" />
                    <PhotoFeedCard
                      photo={url}
                      owner={locationData}
                      currentUser={canInteract ? currentUser : null}
                    />
                  </div>
                ))}
              </div>
            )}

            {!locationData.bio && !locationData.interests?.length && !locationData.photos?.length && !locationData.videos?.length && (
              <div className="flex flex-col items-center py-12 text-center">
                <p className="text-muted-foreground text-sm">No profile info yet.</p>
              </div>
            )}
          </>
        )}

        {!isLoading && !locationData && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm text-muted-foreground">Profile not available.</p>
          </div>
        )}
      </div>


      <PhotoGridLightbox
        photo={lightboxPhoto}
        owner={locationData}
        currentUser={canInteract ? currentUser : null}
        onClose={() => setLightboxPhoto(null)}
      />
    </div>
  );
}
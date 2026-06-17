import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ShieldOff, X, MessageCircle, Heart } from "lucide-react";
import { PROFILE_THEMES } from "@/components/profile/ProfileThemePicker";
import UserAvatar from "@/components/shared/UserAvatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import MediaReactions from "@/components/profile/MediaReactions";

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

  const { data: myLikes = [] } = useQuery({
    queryKey: ["photoLikes", currentUser?.id, userId],
    queryFn: () => base44.entities.PhotoLike.filter({ photo_owner_id: userId }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const likedUrls = new Set(myLikes.filter(l => l.user_id === currentUser?.id).map(l => l.photo_url));
  const likeCounts = myLikes.reduce((acc, l) => { acc[l.photo_url] = (acc[l.photo_url] || 0) + 1; return acc; }, {});

  const toggleLike = useMutation({
    mutationFn: async (photoUrl) => {
      const existing = myLikes.find(l => l.user_id === currentUser.id && l.photo_url === photoUrl);
      if (existing) {
        await base44.entities.PhotoLike.delete(existing.id);
      } else {
        await base44.entities.PhotoLike.create({ user_id: currentUser.id, photo_url: photoUrl, photo_owner_id: userId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["photoLikes", currentUser?.id, userId] }),
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

            {/* Photos */}
            {locationData.photos?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-4 pb-3">
                  Photos · {locationData.photos.length}
                </p>
                <div className="grid grid-cols-3 gap-0.5">
                  {locationData.photos.map((url, i) => (
                    <button key={i} onClick={() => setLightboxPhoto(url)} className="relative aspect-square overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </button>
                  ))}
                </div>
                {canInteract && (
                  <div className="px-4 pt-3 pb-4 space-y-2.5">
                    {locationData.photos.map((url, i) => (
                      <div key={i} className="border-t border-border/50 pt-2.5 first:border-0 first:pt-0">
                        <p className="text-xs text-muted-foreground mb-1.5">Photo {i + 1}</p>
                        <MediaReactions mediaUrl={url} mediaOwnerId={userId} currentUser={currentUser} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Videos */}
            {locationData.videos?.length > 0 && (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-4 pb-3">
                  Videos · {locationData.videos.length}
                </p>
                <div className="space-y-0">
                  {locationData.videos.map((url, i) => (
                    <div key={i} className={`${i > 0 ? "border-t border-border/50" : ""}`}>
                      <video src={url} controls className="w-full max-h-64 bg-black" />
                      {canInteract && (
                        <div className="px-4 py-3">
                          <MediaReactions mediaUrl={url} mediaOwnerId={userId} currentUser={currentUser} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          <img src={lightboxPhoto} alt="" className="max-w-full max-h-full object-contain" />
          <button
            className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxPhoto(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {canInteract && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleLike.mutate(lightboxPhoto); }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-6 py-3 transition-all hover:bg-white/25"
            >
              <Heart className={`h-5 w-5 transition-colors ${likedUrls.has(lightboxPhoto) ? "fill-rose-500 text-rose-500" : "text-white"}`} />
              <span className="text-white font-semibold text-sm">
                {likedUrls.has(lightboxPhoto) ? "Liked" : "Like"}
                {likeCounts[lightboxPhoto] > 0 ? ` · ${likeCounts[lightboxPhoto]}` : ""}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
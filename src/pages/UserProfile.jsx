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

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // back destination passed via navigation state, fallback to "/"
  const backTo = location.state?.from || "/";
  const backTab = location.state?.from || "/";

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Photo likes
  const { data: myLikes = [] } = useQuery({
    queryKey: ["photoLikes", currentUser?.id, userId],
    queryFn: () => base44.entities.PhotoLike.filter({ photo_owner_id: userId }),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const likedUrls = new Set(
    myLikes.filter(l => l.user_id === currentUser?.id).map(l => l.photo_url)
  );
  const likeCounts = myLikes.reduce((acc, l) => {
    acc[l.photo_url] = (acc[l.photo_url] || 0) + 1;
    return acc;
  }, {});

  const toggleLike = useMutation({
    mutationFn: async (photoUrl) => {
      const existing = myLikes.find(l => l.user_id === currentUser.id && l.photo_url === photoUrl);
      if (existing) {
        await base44.entities.PhotoLike.delete(existing.id);
      } else {
        await base44.entities.PhotoLike.create({
          user_id: currentUser.id,
          photo_url: photoUrl,
          photo_owner_id: userId,
        });
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

  // distance is passed via navigation state if available
  const distance = location.state?.distance ?? null;

  const formatDistance = (d) => {
    if (d == null) return null;
    if (d < 1) return `${Math.round(d * 1000)}m away`;
    return `${d.toFixed(1)}km away`;
  };

  const handleBlock = async () => {
    await base44.entities.Block.create({
      blocker_id: currentUser.id,
      blocked_id: userId,
    });
    queryClient.invalidateQueries({ queryKey: ["blocks"] });
    toast.success("User blocked.");
    navigate(backTo, { replace: true, state: { __tab: backTab } });
  };

  const userName = locationData?.user_name || location.state?.userName || "VibeCheck User";
  const theme = PROFILE_THEMES.find(t => t.id === locationData?.profile_theme) || PROFILE_THEMES[0];

  return (
    <div className="px-5 pt-4 pb-10 max-w-lg mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(backTo, { state: { __tab: backTab } })}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 -ml-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className={`bg-gradient-to-br ${theme.gradient} rounded-3xl px-6 pt-8 pb-6 flex flex-col items-center text-center mb-5`}>
        <UserAvatar
          name={userName}
          size="xl"
          colorIndex={userId?.charCodeAt(0) || 0}
          avatarUrl={locationData?.avatar_url}
        />
        <h1 className="text-2xl font-heading font-bold mt-3">{userName}</h1>
        {distance != null && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>{formatDistance(distance)}</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && locationData && (
        <div className="space-y-4">
          {/* Bio + Interests card */}
          {(locationData.bio || locationData.interests?.length > 0) && (
            <div className="space-y-4 bg-card rounded-2xl border border-border p-5">
              {locationData.bio && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">About</p>
                  <p className="text-sm text-foreground leading-relaxed">{locationData.bio}</p>
                </div>
              )}

              {locationData.interests?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Interests</p>
                  <div className="flex flex-wrap gap-1.5">
                    {locationData.interests.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-full text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Photos section */}
          {locationData.photos?.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Photos · {locationData.photos.length}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {locationData.photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                    <button
                      onClick={() => setLightboxPhoto(url)}
                      className="w-full h-full"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                    </button>
                    {currentUser && currentUser.id !== userId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLike.mutate(url); }}
                        className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1"
                      >
                        <Heart className={`h-3 w-3 ${likedUrls.has(url) ? "fill-rose-500 text-rose-500" : "text-white"}`} />
                        {likeCounts[url] > 0 && (
                          <span className="text-white text-[10px] font-semibold">{likeCounts[url]}</span>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!locationData.bio && !locationData.interests?.length && !locationData.photos?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">No profile info yet.</p>
          )}
        </div>
      )}

      {!isLoading && !locationData && (
        <p className="text-sm text-muted-foreground text-center py-10">Profile not available.</p>
      )}

      {/* Message button */}
      {currentUser && currentUser.id !== userId && (
        <div className="mt-4">
          <Button
            className="w-full rounded-xl gap-2"
            onClick={() => navigate(`/messages/${userId}`, { state: { peerName: userName, peerAvatarUrl: locationData?.avatar_url } })}
          >
            <MessageCircle className="h-4 w-4" /> Message {userName}
          </Button>
        </div>
      )}

      {/* Block button */}
      {currentUser && currentUser.id !== userId && (
        <div className="mt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl">
                <ShieldOff className="h-4 w-4 mr-2" /> Block {userName}
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

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          <img src={lightboxPhoto} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            onClick={() => setLightboxPhoto(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {currentUser && currentUser.id !== userId && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleLike.mutate(lightboxPhoto); }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5"
            >
              <Heart className={`h-5 w-5 ${likedUrls.has(lightboxPhoto) ? "fill-rose-500 text-rose-500" : "text-white"}`} />
              <span className="text-white font-semibold text-sm">
                {likedUrls.has(lightboxPhoto) ? "Liked" : "Like"} {likeCounts[lightboxPhoto] > 0 ? `· ${likeCounts[lightboxPhoto]}` : ""}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
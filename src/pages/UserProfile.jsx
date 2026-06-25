import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, ShieldOff, MessageCircle } from "lucide-react";
import ReportButton from "@/components/shared/ReportButton";
import PhotoGridLightbox from "@/components/profile/PhotoGridLightbox";
import PhotoFeedCard from "@/components/explore/PhotoFeedCard";
import { PROFILE_THEMES } from "@/components/profile/ProfileThemePicker";
import UserAvatar from "@/components/shared/UserAvatar";
import MutualFriends from "@/components/profile/MutualFriends";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const INTEREST_COLORS = [
  "bg-gradient-to-r from-red-400 to-orange-400",
  "bg-gradient-to-r from-blue-400 to-cyan-400",
  "bg-gradient-to-r from-emerald-400 to-teal-500",
  "bg-gradient-to-r from-violet-500 to-purple-500",
  "bg-gradient-to-r from-pink-400 to-rose-400",
  "bg-gradient-to-r from-amber-400 to-yellow-400",
  "bg-gradient-to-r from-sky-400 to-blue-500",
  "bg-gradient-to-r from-fuchsia-400 to-pink-500",
];
const getInterestColor = (tag) =>
  INTEREST_COLORS[Math.abs(tag.charCodeAt(0) + tag.charCodeAt(tag.length - 1)) % INTEREST_COLORS.length];

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const backTo = location.state?.from || "/";
  const backTab = location.state?.from || "/";

  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
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
  const canInteract = !isLoadingUser && currentUser && currentUser.id !== userId;

  return (
    <div className="min-h-full" style={{ backgroundColor: "#111114" }}>
      {/* Hero Banner */}
      <div className="relative" style={{ background: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)", minHeight: "220px" }}>
        {locationData?.banner_url && (
          <img src={locationData.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        )}
        <div className="relative z-10">
          {/* Back button */}
          <button
            onClick={() => navigate(backTo, { state: { __tab: backTab } })}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white transition-colors px-4 pt-4 pb-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center px-5 pt-5 pb-10">
            <div style={{ padding: "3px", background: "linear-gradient(135deg, #fff, rgba(255,255,255,0.5))", borderRadius: "9999px" }}>
              <UserAvatar
                name={userName}
                size="xl"
                colorIndex={userId?.charCodeAt(0) || 0}
                avatarUrl={locationData?.avatar_url}
              />
            </div>
            <h1 className="text-2xl font-bold mt-3 text-white drop-shadow-lg">{userName}</h1>
            {distance != null && (
              <div className="flex items-center gap-1 text-sm text-white/70 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{formatDistance(distance)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {canInteract && (
        <div className="px-4 -mt-5 mb-5 flex gap-3 relative z-20">
          <Button
            className="flex-1 rounded-2xl shadow-xl gap-2 h-11 text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}
            onClick={() => navigate(`/messages/${userId}`, { state: { peerName: userName, peerAvatarUrl: locationData?.avatar_url } })}
          >
            <MessageCircle className="h-4 w-4" /> Message
          </Button>
          <div className="flex items-center justify-center h-11 w-12 flex-shrink-0 rounded-2xl" style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a33" }}>
            <ReportButton
              currentUser={canInteract ? currentUser : null}
              reportedUserId={userId}
              reportedUserName={userName}
              contentType="profile"
              iconOnly
            />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-2xl h-11 w-12 flex-shrink-0"
                style={{ backgroundColor: "#1e1e24", border: "1px solid #2a2a33" }}
              >
                <ShieldOff className="h-4 w-4 text-red-400" />
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
      <div className="px-4 pb-12 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && locationData && (
          <>
            {/* Bio */}
            {locationData.bio && (
              <div className="rounded-2xl p-4" style={{ backgroundColor: "#1a1a22", border: "1px solid #2a2a35" }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">About</p>
                <p className="text-sm text-gray-200 leading-relaxed">{locationData.bio}</p>
              </div>
            )}

            {/* Interests */}
            {locationData.interests?.length > 0 && (
              <div className="rounded-2xl p-4" style={{ backgroundColor: "#1a1a22", border: "1px solid #2a2a35" }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {locationData.interests.map((tag) => (
                    <span
                      key={tag}
                      className={`${getInterestColor(tag)} text-white rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Photos grid */}
            {locationData.photos?.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#1a1a22", border: "1px solid #2a2a35" }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 pt-4 pb-3">
                  Photos · {locationData.photos.length}
                </p>
                <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-0.5">
                  {locationData.photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxPhoto(url)}
                      className="relative aspect-square overflow-hidden bg-gray-900 group"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {locationData.videos?.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#1a1a22", border: "1px solid #2a2a35" }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 pt-4 pb-1">
                  Videos · {locationData.videos.length}
                </p>
                {locationData.videos.map((url, i) => (
                  <div key={i} className={i > 0 ? "border-t border-white/5" : ""}>
                    <video src={url} controls className="w-full max-h-72 bg-black" />
                    <PhotoFeedCard
                      photo={url}
                      owner={locationData}
                      currentUser={canInteract ? currentUser : null}
                      darkMode
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Mutual Friends */}
            <MutualFriends currentUserId={currentUser?.id} profileUserId={userId} />

            {!locationData.bio && !locationData.interests?.length && !locationData.photos?.length && !locationData.videos?.length && (
              <div className="flex flex-col items-center py-16 text-center">
                <p className="text-gray-500 text-sm">No profile info yet.</p>
              </div>
            )}
          </>
        )}

        {!isLoading && !locationData && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm text-gray-500">Profile not available.</p>
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
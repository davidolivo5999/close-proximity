import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, X, ShieldOff } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function UserProfileModal({ userId, userName, distance, open, onClose, currentUserId }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const queryClient = useQueryClient();

  const handleBlock = async () => {
    await base44.entities.Block.create({ blocker_id: currentUserId, blocked_id: userId });
    queryClient.invalidateQueries({ queryKey: ["blocks"] });
    toast.success(`${userName} has been blocked.`);
    onClose();
  };

  const { data: locationData, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      const results = await base44.entities.UserLocation.filter({ user_id: userId });
      return results[0] || null;
    },
    enabled: !!userId && open,
  });

  const formatDistance = (d) => {
    if (d == null) return null;
    if (d < 1) return `${Math.round(d * 1000)}m away`;
    return `${d.toFixed(1)}km away`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden border-0">
          {/* Header gradient */}
          <div className="bg-gradient-to-br from-primary/20 to-accent/20 px-6 pt-8 pb-6 flex flex-col items-center text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/10 flex items-center justify-center text-foreground/70 hover:bg-black/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <UserAvatar
              name={userName}
              size="xl"
              colorIndex={userId?.charCodeAt(0) || 0}
            />
            <h2 className="text-xl font-heading font-bold mt-3">{userName || "Unknown"}</h2>

            {distance != null && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{formatDistance(distance)}</span>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 pt-4 space-y-4">
            {isLoading && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && locationData && (
              <>
                {/* Bio */}
                {locationData.bio && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">About</p>
                    <p className="text-sm text-foreground leading-relaxed">{locationData.bio}</p>
                  </div>
                )}

                {/* Interests */}
                {locationData.interests?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {locationData.interests.map((tag) => (
                        <Badge key={tag} variant="secondary" className="rounded-full text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {locationData.photos?.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Photos</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {locationData.photos.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setLightboxPhoto(url)}
                          className="aspect-square rounded-xl overflow-hidden"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!locationData.bio && !locationData.interests?.length && !locationData.photos?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No profile info yet.</p>
                )}
              </>
            )}

            {/* Block button */}
            {currentUserId && currentUserId !== userId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl mt-2">
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
            )}

            {!isLoading && !locationData && (
              <p className="text-sm text-muted-foreground text-center py-4">Profile not available.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          <img src={lightboxPhoto} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
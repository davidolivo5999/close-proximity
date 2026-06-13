import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LogOut, Save, Eye, EyeOff, Camera, X, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import UserAvatar from "@/components/shared/UserAvatar";
import { INTEREST_TAGS } from "@/components/nearby/NearbyFilters";
import PastHangouts from "@/components/profile/PastHangouts";
import PrivacyZones from "@/components/profile/PrivacyZones";

export default function Profile() {
  const queryClient = useQueryClient();
  const [bio, setBio] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [privacyZones, setPrivacyZones] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: myLocation } = useQuery({
    queryKey: ["myLocation", user?.id],
    queryFn: async () => {
      const locs = await base44.entities.UserLocation.filter({ user_id: user.id });
      return locs[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: friendCount = 0 } = useQuery({
    queryKey: ["friendCount", user?.id],
    queryFn: async () => {
      const sent = await base44.entities.FriendRequest.filter({
        from_user_id: user.id,
        status: "accepted",
      });
      const received = await base44.entities.FriendRequest.filter({
        to_user_id: user.id,
        status: "accepted",
      });
      return sent.length + received.length;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (myLocation) {
      setBio(myLocation.bio || "");
      setIsVisible(myLocation.is_visible !== false);
      setInterests(myLocation.interests || []);
      setPhotos(myLocation.photos || []);
      setPrivacyZones(myLocation.privacy_zones || []);
    }
  }, [myLocation]);

  const handleSave = async () => {
    if (!myLocation) {
      toast.error("Please enable location first on the Discover tab");
      return;
    }
    setSaving(true);
    await base44.entities.UserLocation.update(myLocation.id, {
      bio,
      is_visible: isVisible,
      interests,
      photos,
      privacy_zones: privacyZones,
    });
    queryClient.invalidateQueries({ queryKey: ["myLocation"] });
    toast.success("Profile updated!");
    setSaving(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotos((prev) => [...prev, file_url]);
    setUploadingPhoto(false);
  };

  const handleRemovePhoto = (url) => {
    setPhotos((prev) => prev.filter((p) => p !== url));
  };

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  const handleDeleteProfile = async () => {
    if (myLocation) {
      await base44.entities.UserLocation.delete(myLocation.id);
    }
    // Delete friend requests
    const sent = await base44.entities.FriendRequest.filter({ from_user_id: user.id });
    const received = await base44.entities.FriendRequest.filter({ to_user_id: user.id });
    for (const r of [...sent, ...received]) {
      await base44.entities.FriendRequest.delete(r.id);
    }
    // Delete the auth account itself
    await base44.auth.deleteMe();
    toast.success("Account deleted. Signing you out...");
    setTimeout(() => base44.auth.logout("/login"), 1500);
  };

  return (
    <div className="px-5 pt-6">
      <div className="flex flex-col items-center mb-8">
        <UserAvatar
          name={user?.full_name}
          size="xl"
          colorIndex={user?.id?.charCodeAt(0) || 0}
        />
        <h1 className="text-xl font-heading font-bold mt-4">{user?.full_name}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{friendCount}</p>
            <p className="text-xs text-muted-foreground">Friends</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">
              {isVisible ? (
                <span className="text-emerald-500">On</span>
              ) : (
                <span className="text-muted-foreground">Off</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">Visibility</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 bg-card rounded-2xl border border-border p-5">
        <div>
          <Label className="text-sm font-medium mb-2 block">Bio</Label>
          <Textarea
            placeholder="Tell people a little about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="rounded-xl resize-none bg-muted/50 border-0 focus-visible:ring-primary/30"
            rows={3}
          />
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Interests</Label>
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_TAGS.map((tag) => {
              const active = interests.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setInterests(active ? interests.filter((t) => t !== tag) : [...interests, tag])
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Photos */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Photos</Label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(url)}
                  className="absolute top-1 right-1 h-5 w-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                {uploadingPhoto ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Add</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
            )}
          </div>
        </div>

        <PrivacyZones zones={privacyZones} onChange={setPrivacyZones} />

        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isVisible ? (
              <Eye className="h-4 w-4 text-emerald-500" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">Discoverable</p>
              <p className="text-xs text-muted-foreground">Others can see you nearby</p>
            </div>
          </div>
          <Switch checked={isVisible} onCheckedChange={setIsVisible} />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <PastHangouts userId={user?.id} />

      <div className="flex flex-col gap-2 mt-6 mb-8">
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-xl text-sm">
              <Trash2 className="h-4 w-4 mr-2" /> Delete Profile
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your profile?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your location, photos, interests, and friend connections. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProfile}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete my profile
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LogOut, Save, Eye, EyeOff, Camera, X, Trash2, ChevronRight, Users, Star, Shield, Pencil, Check } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { isAdmin, isAuthenticated } from "@/lib/roleCheck";
import UserAvatar from "@/components/shared/UserAvatar";
import { INTEREST_TAGS } from "@/components/nearby/NearbyFilters";
import PastHangouts from "@/components/profile/PastHangouts";
import PrivacyZones from "@/components/profile/PrivacyZones";
import ExportReport from "@/components/profile/ExportReport";
import BlockedUsers from "@/components/profile/BlockedUsers";
import { PROFILE_THEMES } from "@/components/profile/ProfileThemePicker";

export default function Profile() {
  const queryClient = useQueryClient();
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [privacyZones, setPrivacyZones] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [profileTheme, setProfileTheme] = useState("default");
  const [saving, setSaving] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState("about");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: myLocation } = useQuery({
    queryKey: ["myLocation", user?.id],
    queryFn: async () => {
      const locs = await base44.entities.UserLocation.filter({ user_id: user.id });
      if (locs.length === 0) return null;
      const sorted = [...locs].sort((a, b) => {
        const aScore = (a.photos?.length || 0) + (a.avatar_url ? 10 : 0);
        const bScore = (b.photos?.length || 0) + (b.avatar_url ? 10 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return new Date(b.updated_date) - new Date(a.updated_date);
      });
      return sorted[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: friendCount = 0 } = useQuery({
    queryKey: ["friendCount", user?.id],
    queryFn: async () => {
      const [sent, received] = await Promise.all([
        base44.entities.FriendRequest.filter({ from_user_id: user.id, status: "accepted" }),
        base44.entities.FriendRequest.filter({ to_user_id: user.id, status: "accepted" }),
      ]);
      return sent.length + received.length;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  useEffect(() => {
    if (myLocation) {
      setBio(myLocation.bio || "");
      setDisplayName(myLocation.user_name || user?.full_name || "");
      setIsVisible(myLocation.is_visible !== false);
      setInterests(myLocation.interests || []);
      setPhotos(myLocation.photos || []);
      setPrivacyZones(myLocation.privacy_zones || []);
      setProfileTheme(myLocation.profile_theme || "default");
      setAvatarUrl(myLocation.avatar_url || "");
      setBannerUrl(myLocation.banner_url || "");
    }
  }, [myLocation, user]);

  const handleSave = async () => {
    if (!isAuthenticated(user)) { toast.error("Sign in to save profile changes"); return; }
    if (!myLocation) { toast.error("Please enable location first on the Discover tab"); return; }
    setSaving(true);
    await base44.entities.UserLocation.update(myLocation.id, {
      bio, is_visible: isVisible, interests, photos, privacy_zones: privacyZones,
      profile_theme: profileTheme, avatar_url: avatarUrl, banner_url: bannerUrl,
      user_name: displayName || user?.full_name,
    });
    queryClient.invalidateQueries({ queryKey: ["myLocation"] });
    toast.success("Profile updated!");
    setSaving(false);
    setEditingBio(false);
    setEditingName(false);
  };

  const handlePhotoUpload = async (e) => {
    if (!isAuthenticated(user)) { toast.error("Sign in to upload photos"); return; }
    const file = e.target.files[0];
    if (!file || !myLocation) return;
    // Reset input so same file can be re-selected
    e.target.value = "";
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const saved = [...photos, file_url];
    setPhotos(saved);
    await base44.entities.UserLocation.update(myLocation.id, { photos: saved });
    // Update cache directly instead of invalidating to avoid useEffect resetting state
    queryClient.setQueryData(["myLocation", user?.id], (old) => old ? { ...old, photos: saved } : old);
    setUploadingPhoto(false);
    toast.success("Photo saved!");
  };

  const handleAvatarUpload = async (e) => {
    if (!isAuthenticated(user)) { toast.error("Sign in to upload a profile picture"); return; }
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    // Show local preview instantly
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    URL.revokeObjectURL(localUrl);
    setAvatarUrl(file_url);
    if (myLocation) {
      await base44.entities.UserLocation.update(myLocation.id, { avatar_url: file_url });
      // Update cache directly to avoid state reset race condition
      queryClient.setQueryData(["myLocation", user?.id], (old) => old ? { ...old, avatar_url: file_url } : old);
      toast.success("Profile picture updated!");
    }
    setUploadingAvatar(false);
  };

  const handleBannerUpload = async (e) => {
    if (!isAuthenticated(user)) { toast.error("Sign in to upload a banner"); return; }
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const localUrl = URL.createObjectURL(file);
    setBannerUrl(localUrl);
    setUploadingBanner(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    URL.revokeObjectURL(localUrl);
    setBannerUrl(file_url);
    if (myLocation) {
      await base44.entities.UserLocation.update(myLocation.id, { banner_url: file_url });
      queryClient.setQueryData(["myLocation", user?.id], (old) => old ? { ...old, banner_url: file_url } : old);
      toast.success("Banner updated!");
    }
    setUploadingBanner(false);
  };

  const handleRemoveBanner = async () => {
    if (!myLocation) return;
    setBannerUrl("");
    await base44.entities.UserLocation.update(myLocation.id, { banner_url: "" });
    queryClient.setQueryData(["myLocation", user?.id], (old) => old ? { ...old, banner_url: "" } : old);
    toast.success("Banner removed");
  };

  const handleRemovePhoto = async (url) => {
    if (!myLocation) return;
    const updated = photos.filter((p) => p !== url);
    setPhotos(updated);
    await base44.entities.UserLocation.update(myLocation.id, { photos: updated });
    queryClient.setQueryData(["myLocation", user?.id], (old) => old ? { ...old, photos: updated } : old);
  };
  const handleLogout = () => base44.auth.logout("/");

  const handleDeleteProfile = async () => {
    if (myLocation) await base44.entities.UserLocation.delete(myLocation.id);
    const sent = await base44.entities.FriendRequest.filter({ from_user_id: user.id });
    const received = await base44.entities.FriendRequest.filter({ to_user_id: user.id });
    for (const r of [...sent, ...received]) await base44.entities.FriendRequest.delete(r.id);
    await base44.auth.deleteMe();
    toast.success("Account deleted. Signing you out...");
    setTimeout(() => base44.auth.logout("/login"), 1500);
  };

  const tabs = [
    { id: "about", label: "About" },
    { id: "photos", label: "Photos" },
    { id: "hangouts", label: "Hangouts" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div style={{ marginBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
      {!isAuthenticated(user) && (
        <div className="bg-primary/10 border-b border-primary/20 px-5 py-2.5 text-center text-sm text-primary font-medium">
          👀 Preview Mode — Sign in to customize your profile
        </div>
      )}
      {/* Hero */}
      <div className="relative">
        {/* Banner */}
        <div className={`relative h-36 ${bannerUrl ? "" : `bg-gradient-to-br ${PROFILE_THEMES.find(t => t.id === profileTheme)?.gradient || "from-primary/20 to-accent/20"}`}`}>
          {bannerUrl && <img src={bannerUrl} alt="Profile banner" className="w-full h-full object-cover" />}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <label className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full px-2.5 py-1 cursor-pointer hover:bg-black/70 transition-colors">
              {uploadingBanner ? (
                <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
              {bannerUrl ? "Change" : "Add banner"}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner} />
            </label>
            {bannerUrl && (
              <button
                onClick={handleRemoveBanner}
                className="flex items-center bg-black/50 backdrop-blur-sm text-white rounded-full px-2 py-1 hover:bg-black/70 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center pb-6 px-5" style={{ marginTop: "-2.5rem" }}>
          <div className="relative">
            <UserAvatar
              name={user?.full_name}
              size="xl"
              colorIndex={user?.id?.charCodeAt(0) || 0}
              avatarUrl={avatarUrl}
            />
            <label className="absolute inset-0 rounded-full cursor-pointer flex items-end justify-center pb-1 bg-black/0 hover:bg-black/30 transition-colors group">
              {uploadingAvatar ? (
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin mb-1" />
              ) : (
                <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity mb-1" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
            <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background ${isVisible ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          </div>
          <h1 className="text-2xl font-heading font-bold mt-3 text-foreground">{displayName || user?.full_name}</h1>


          {/* Stats row */}
          <div className="flex items-center gap-8 mt-3 bg-card/60 backdrop-blur-sm rounded-2xl px-6 py-3 border border-border/50">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{friendCount}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Friends</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{interests.length}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> Interests</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{photos.length}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Camera className="h-3 w-3" /> Photos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        {/* ABOUT TAB */}
        {activeTab === "about" && (
          <>
            {/* Display name card */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Display Name</p>
                <button
                  onClick={() => editingName ? handleSave() : setEditingName(true)}
                  className="flex items-center gap-1 text-xs text-primary font-medium"
                >
                  {editingName ? <><Check className="h-3.5 w-3.5" /> Save</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                </button>
              </div>
              {editingName ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-muted/50 border-0 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                  placeholder="Your display name"
                />
              ) : (
                <p className="text-sm text-muted-foreground">{displayName || user?.full_name || "No name set"}</p>
              )}
            </div>

            {/* Bio card */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Bio</p>
                <button
                  onClick={() => editingBio ? handleSave() : setEditingBio(true)}
                  className="flex items-center gap-1 text-xs text-primary font-medium"
                >
                  {editingBio ? <><Check className="h-3.5 w-3.5" /> Save</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                </button>
              </div>
              {editingBio ? (
                <Textarea
                  placeholder="Tell people a little about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="rounded-xl resize-none bg-muted/50 border-0 focus-visible:ring-primary/30"
                  rows={3}
                  autoFocus
                />
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {bio || "No bio yet. Tap Edit to add one."}
                </p>
              )}
            </div>

            {/* Interests card */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Interests</p>
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
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {interests.length > 0 && (
                <Button onClick={handleSave} disabled={saving} size="sm" className="mt-3 rounded-xl">
                  {saving ? "Saving..." : "Save interests"}
                </Button>
              )}
            </div>
          </>
        )}

        {/* PHOTOS TAB */}
        {activeTab === "photos" && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-sm font-semibold text-foreground mb-3">My Photos</p>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(url)}
                    className="absolute top-1.5 right-1.5 h-6 w-6 bg-black/60 backdrop-blur rounded-full flex items-center justify-center"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  {uploadingPhoto ? (
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Add photo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                </label>
              )}
            </div>

          </div>
        )}

        {/* HANGOUTS TAB */}
        {activeTab === "hangouts" && (
          <>
            <PastHangouts userId={user?.id} />
            <div className="mt-2">
              <ExportReport userId={user?.id} />
            </div>
          </>
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <>
            {/* Visibility */}
            <div className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isVisible ? "bg-emerald-100" : "bg-muted"}`}>
                  {isVisible ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Discoverable</p>
                  <p className="text-xs text-muted-foreground">Show up on the Nearby map</p>
                </div>
              </div>
              <Switch checked={isVisible} onCheckedChange={(v) => { setIsVisible(v); }} />
            </div>

            {/* Privacy zones */}
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-accent" />
                </div>
                <p className="text-sm font-semibold text-foreground">Privacy Zones</p>
              </div>
              <PrivacyZones zones={privacyZones} onChange={setPrivacyZones} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>

            {/* Blocked users */}
            <BlockedUsers userId={user?.id} />

            {/* Account actions */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden mt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">Sign Out</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="border-t border-border" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-destructive/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-4 w-4 text-destructive/70" />
                      <span className="text-sm text-destructive/80">Delete Profile</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
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
                    <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, delete my profile
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { LogOut, Save, Eye, EyeOff, Camera, X, Trash2, ChevronRight, Users, Star, Shield, Pencil, Check, Video, HelpCircle, Flag, TrendingUp } from "lucide-react";
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
import BlockedUsers from "@/components/profile/BlockedUsers";
import { PROFILE_THEMES } from "@/components/profile/ProfileThemePicker";
import VideoEditor from "@/components/profile/VideoEditor";

// Colorful gradient pills for interests
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

const getInterestColor = (tag) => INTEREST_COLORS[Math.abs(tag.charCodeAt(0) + tag.charCodeAt(tag.length - 1)) % INTEREST_COLORS.length];

export default function Profile() {
  const queryClient = useQueryClient();
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [privacyZones, setPrivacyZones] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bannerUrl, setBannerUrl] = useState("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [profileTheme, setProfileTheme] = useState("default");
  const [saving, setSaving] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
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
      setVideos(myLocation.videos || []);
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
      bio, is_visible: isVisible, interests, photos, videos, privacy_zones: privacyZones,
      profile_theme: profileTheme, avatar_url: avatarUrl, banner_url: bannerUrl,
      user_name: displayName || user?.full_name,
    });
    queryClient.invalidateQueries({ queryKey: ["myLocation"] });
    toast.success("Profile updated!");
    setSaving(false);
    setEditingBio(false);
    setEditingName(false);
    setEditingInterests(false);
  };

  const handlePhotoUpload = async (e) => {
    if (!isAuthenticated(user)) { toast.error("Sign in to upload photos"); return; }
    const file = e.target.files[0];
    if (!file || !myLocation) return;
    e.target.value = "";
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const saved = [...photos, file_url];
    setPhotos(saved);
    await base44.entities.UserLocation.update(myLocation.id, { photos: saved });
    queryClient.setQueryData(["myLocation", user?.id], (old) => old ? { ...old, photos: saved } : old);
    setUploadingPhoto(false);
    toast.success("Photo saved!");
  };

  const handleAvatarUpload = async (e) => {
    if (!isAuthenticated(user)) { toast.error("Sign in to upload a profile picture"); return; }
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    URL.revokeObjectURL(localUrl);
    setAvatarUrl(file_url);
    if (myLocation) {
      await base44.entities.UserLocation.update(myLocation.id, { avatar_url: file_url });
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

  const handleVideoUpload = (e) => {
    if (!isAuthenticated(user)) { toast.error("Sign in to upload videos"); return; }
    const file = e.target.files[0];
    if (!file || !myLocation) return;
    e.target.value = "";
    setPendingVideoFile(file);
  };

  const handleVideoConfirmed = async (file) => {
    setPendingVideoFile(null);
    setUploadingVideo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const saved = [...videos, file_url];
    setVideos(saved);
    await base44.entities.UserLocation.update(myLocation.id, { videos: saved });
    queryClient.setQueryData(["myLocation", user?.id], (old) => old ? { ...old, videos: saved } : old);
    setUploadingVideo(false);
    toast.success("Video saved!");
  };

  const handleRemoveVideo = async (url) => {
    if (!myLocation) return;
    const updated = videos.filter((v) => v !== url);
    setVideos(updated);
    await base44.entities.UserLocation.update(myLocation.id, { videos: updated });
    queryClient.setQueryData(["myLocation", user?.id], (old) => old ? { ...old, videos: updated } : old);
  };

  const handleLogout = () => base44.auth.logout("/");

  const handleDeleteProfile = async () => {
    try {
      // Delete all user data in parallel where possible
      await Promise.all([
        // Location / profile
        myLocation ? base44.entities.UserLocation.delete(myLocation.id) : Promise.resolve(),
        // Friend requests (sent + received)
        base44.entities.FriendRequest.filter({ from_user_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.FriendRequest.delete(r.id)))),
        base44.entities.FriendRequest.filter({ to_user_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.FriendRequest.delete(r.id)))),
        // Encounters (own + others who encountered this user)
        base44.entities.Encounter.filter({ user_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.Encounter.delete(r.id)))),
        base44.entities.Encounter.filter({ encountered_user_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.Encounter.delete(r.id)))),
        // Direct messages (sent + received)
        base44.entities.DirectMessage.filter({ from_user_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.DirectMessage.delete(r.id)))),
        base44.entities.DirectMessage.filter({ to_user_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.DirectMessage.delete(r.id)))),
        // Blocks (initiated by or against this user)
        base44.entities.Block.filter({ blocker_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.Block.delete(r.id)))),
        base44.entities.Block.filter({ blocked_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.Block.delete(r.id)))),
        // Photo likes
        base44.entities.PhotoLike.filter({ user_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.PhotoLike.delete(r.id)))),
        base44.entities.PhotoLike.filter({ photo_owner_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.PhotoLike.delete(r.id)))),
        // Media reactions
        base44.entities.MediaReaction.filter({ user_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.MediaReaction.delete(r.id)))),
        base44.entities.MediaReaction.filter({ media_owner_id: user.id }).then(rs => Promise.all(rs.map(r => base44.entities.MediaReaction.delete(r.id)))),
      ]);
      // Delete the auth account last
      await base44.auth.deleteMe();
      toast.success("Account deleted. Signing you out...");
      setTimeout(() => base44.auth.logout("/login"), 1500);
    } catch (err) {
      toast.error("Failed to delete account. Please try again.");
    }
  };

  const tabs = [
    { id: "about", label: "About" },
    { id: "photos", label: "Photos" },
    { id: "hangouts", label: "Hangouts" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f2f2ed", marginBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}>
      {pendingVideoFile && (
        <VideoEditor
          file={pendingVideoFile}
          onConfirm={handleVideoConfirmed}
          onCancel={() => setPendingVideoFile(null)}
        />
      )}

      {/* Hero Banner — full-bleed gradient */}
      <div className="relative" style={{ background: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)", minHeight: "200px" }}>
        {bannerUrl && (
          <img src={bannerUrl} alt="Profile banner" className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* Preview mode notice pill */}
        {!isAuthenticated(user) && (
          <div className="absolute top-3 left-4 right-4 flex items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm font-medium text-gray-800">
              <span>👀</span>
              <span><strong>Preview Mode</strong> — Sign in to customize your profile.</span>
            </div>
            <label className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-semibold rounded-full px-3 py-2 cursor-pointer whitespace-nowrap">
              {uploadingBanner ? (
                <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              Add banner
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner} />
            </label>
          </div>
        )}

        {/* Banner controls when logged in */}
        {isAuthenticated(user) && (
          <div className="absolute top-3 right-3 flex gap-1.5 z-10">
            <label className="flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs rounded-full px-2.5 py-1.5 cursor-pointer hover:bg-black/70 transition-colors">
              {uploadingBanner ? (
                <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
              {bannerUrl ? "Change" : "Add banner"}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploadingBanner} />
            </label>
            {bannerUrl && (
              <button onClick={handleRemoveBanner} className="flex items-center bg-black/50 backdrop-blur-sm text-white rounded-full px-2 py-1.5 hover:bg-black/70 transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Avatar — overlapping bottom of banner */}
        <div className="flex justify-center" style={{ paddingTop: "60px", paddingBottom: "0px" }}>
          <div className="relative" style={{ marginBottom: "-48px" }}>
            <div style={{ padding: "4px", background: "linear-gradient(135deg, #f97316, #ec4899)", borderRadius: "9999px" }}>
              <div style={{ padding: "3px", backgroundColor: "white", borderRadius: "9999px" }}>
                <UserAvatar
                  name={user?.full_name}
                  size="xl"
                  colorIndex={user?.id?.charCodeAt(0) || 0}
                  avatarUrl={avatarUrl}
                />
              </div>
            </div>
            <label className="absolute inset-0 rounded-full cursor-pointer flex items-end justify-center pb-1 bg-black/0 hover:bg-black/20 transition-colors group">
              {uploadingAvatar && (
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin mb-1" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
            </label>
            {/* Online indicator */}
            <div className={`absolute bottom-1 right-1 h-5 w-5 rounded-full border-2 border-white ${isVisible ? "bg-emerald-500" : "bg-gray-400"}`} />
          </div>
        </div>
      </div>

      {/* Stats cards — 3 colored cards */}
      <div className="px-4 pt-14 pb-4 grid grid-cols-3 gap-3">
        {/* Friends — orange */}
        <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}>
          <div className="flex items-start justify-between">
            <p className="text-3xl font-bold">{friendCount}</p>
            <Users className="h-6 w-6 opacity-80" />
          </div>
          <p className="text-sm font-medium mt-1 opacity-90">Friends</p>
        </div>
        {/* Interests — teal */}
        <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
          <div className="flex items-start justify-between">
            <p className="text-3xl font-bold">{interests.length}</p>
            <Star className="h-6 w-6 opacity-80" />
          </div>
          <p className="text-sm font-medium mt-1 opacity-90">Interests</p>
        </div>
        {/* Photos — purple */}
        <div className="rounded-2xl p-4 text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #8b5cf6)" }}>
          <div className="flex items-start justify-between">
            <p className="text-3xl font-bold">{photos.length}</p>
            <Camera className="h-6 w-6 opacity-80" />
          </div>
          <p className="text-sm font-medium mt-1 opacity-90">Photos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex bg-white rounded-2xl p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 space-y-3 pb-4">

        {/* ABOUT TAB */}
        {activeTab === "about" && (
          <>
            {/* Display Name */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-base font-bold text-gray-900">Display Name</p>
                <button
                  onClick={() => editingName ? handleSave() : setEditingName(true)}
                  className="flex items-center gap-1 text-sm text-gray-500 font-medium"
                >
                  {editingName ? <><Check className="h-3.5 w-3.5" /> Save</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                </button>
              </div>
              {editingName ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                  placeholder="Your display name"
                />
              ) : (
                <p className="text-sm text-gray-500">{displayName || user?.full_name || "No name set"}</p>
              )}
            </div>

            {/* Bio */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-base font-bold text-gray-900">Bio</p>
                <button
                  onClick={() => editingBio ? handleSave() : setEditingBio(true)}
                  className="flex items-center gap-1 text-sm text-gray-500 font-medium"
                >
                  {editingBio ? <><Check className="h-3.5 w-3.5" /> Save</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                </button>
              </div>
              {editingBio ? (
                <Textarea
                  placeholder="Tell people a little about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="rounded-xl resize-none bg-gray-50 border-gray-200 focus-visible:ring-primary/30"
                  rows={3}
                  autoFocus
                />
              ) : (
                <p className="text-sm text-gray-500 leading-relaxed">
                  {bio || "No bio yet. Tap Edit to add one."}
                </p>
              )}
            </div>

            {/* Interests */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-base font-bold text-gray-900">Interests</p>
                <button
                  onClick={() => editingInterests ? handleSave() : setEditingInterests(true)}
                  className="flex items-center gap-1 text-sm text-gray-500 font-medium"
                >
                  {editingInterests ? <><Check className="h-3.5 w-3.5" /> Save</> : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingInterests ? (
                  INTEREST_TAGS.map((tag) => {
                    const active = interests.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setInterests(active ? interests.filter((t) => t !== tag) : [...interests, tag])
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border-2 transition-all ${
                          active
                            ? "border-primary bg-primary text-white"
                            : "border-gray-200 bg-gray-50 text-gray-600"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })
                ) : interests.length > 0 ? (
                  interests.map((tag) => (
                    <span
                      key={tag}
                      className={`${getInterestColor(tag)} text-white rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm`}
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No interests yet. Tap Edit to add some.</p>
                )}
              </div>
            </div>

            {/* Photo Grid preview in About */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-base font-bold text-gray-900">Photo Grid</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">{photos.length} Photos</p>
              {photos.length === 0 ? (
                <div className="relative">
                  <div className="grid grid-cols-4 gap-1.5 opacity-30">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-gray-200 flex items-center justify-center">
                        <Camera className="h-4 w-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Camera className="h-7 w-7 text-gray-400 mb-1" />
                    <p className="text-sm font-semibold text-gray-600 mb-2">No photos yet</p>
                    <label className="bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-xl px-4 py-1.5 cursor-pointer shadow-sm">
                      Add Photos
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {photos.slice(0, 8).map((url, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* PHOTOS TAB */}
        {activeTab === "photos" && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-base font-bold text-gray-900 mb-3">My Photos</p>
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
                  <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-gray-50 transition-colors">
                    {uploadingPhoto ? (
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-6 w-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-400">Add photo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-base font-bold text-gray-900 mb-3">My Videos</p>
              <div className="space-y-2">
                {videos.map((url, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden bg-black">
                    <video src={url} controls className="w-full max-h-56 rounded-xl" />
                    <button
                      type="button"
                      onClick={() => handleRemoveVideo(url)}
                      className="absolute top-2 right-2 h-6 w-6 bg-black/60 backdrop-blur rounded-full flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                ))}
                {videos.length < 3 && (
                  <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-primary/50 hover:bg-gray-50 transition-colors">
                    {uploadingVideo ? (
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <Video className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-400">Add video</span>
                      </>
                    )}
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} disabled={uploadingVideo} />
                  </label>
                )}
              </div>
            </div>
          </>
        )}

        {/* HANGOUTS TAB */}
        {activeTab === "hangouts" && (
          <PastHangouts userId={user?.id} />
        )}

        {/* SETTINGS TAB */}
        {activeTab === "settings" && (
          <>
            {/* Visibility */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isVisible ? "bg-emerald-100" : "bg-gray-100"}`}>
                  {isVisible ? <Eye className="h-5 w-5 text-emerald-600" /> : <EyeOff className="h-5 w-5 text-gray-400" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Discoverable</p>
                  <p className="text-xs text-gray-400">Show up on the Nearby map</p>
                </div>
              </div>
              <Switch checked={isVisible} onCheckedChange={(v) => setIsVisible(v)} />
            </div>

            {/* Privacy Zones */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-violet-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Privacy Zones</p>
              </div>
              <PrivacyZones zones={privacyZones} onChange={setPrivacyZones} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl h-11 font-semibold">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>

            {/* Blocked Users */}
            <BlockedUsers userId={user?.id} />

            {/* Account actions */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {isAdmin(user) && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      <span className="text-sm font-medium text-gray-800">Admin Dashboard</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </Link>
                  <div className="border-t border-gray-100" />
                  <Link
                    to="/admin/reports"
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Flag className="h-5 w-5 text-orange-400" />
                      <span className="text-sm font-medium text-gray-800">Content Reports</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </Link>
                  <div className="border-t border-gray-100" />
                </>
              )}
              <Link
                to="/support"
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-800">Support</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </Link>
              <div className="border-t border-gray-100" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-800">Sign Out</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </button>
              <div className="border-t border-gray-100" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-4 hover:bg-red-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Trash2 className="h-5 w-5 text-red-400" />
                      <span className="text-sm font-medium text-red-500">Delete Profile</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
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
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Flag, Trash2, CheckCircle2, Eye, Loader2, RefreshCw, ShieldCheck, Ban } from "lucide-react";
import { toast } from "sonner";
import UserAvatar from "@/components/shared/UserAvatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  reviewed: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  dismissed: "bg-gray-100 text-gray-500 border-gray-200",
};

const CONTENT_ICONS = {
  photo: "🖼️",
  video: "🎬",
  message: "💬",
  profile: "👤",
};

export default function AdminReports() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [actingOn, setActingOn] = useState(null);
  const [banTarget, setBanTarget] = useState(null); // { userId, userName, reportId }

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ["adminReports"],
    queryFn: () => base44.entities.Report.list("-created_date", 100),
    enabled: user?.role === "admin",
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  // Guard: only admins
  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <ShieldCheck className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Admin access only</p>
      </div>
    );
  }

  const filtered = reports.filter(r => filter === "all" ? true : r.status === filter);

  const handleDeleteContent = async (report) => {
    setActingOn(report.id);
    try {
      // 1. Find reported user's UserLocation record
      const locations = await base44.entities.UserLocation.filter({ user_id: report.reported_user_id });
      if (locations.length === 0) {
        toast.error("User's location record not found.");
        setActingOn(null);
        return;
      }
      const loc = locations[0];

      // 2. Remove matching photo or video
      let updated = false;
      const updates = {};

      if (report.content_type === "photo" && report.content_url) {
        const newPhotos = (loc.photos || []).filter(url => url !== report.content_url);
        if (newPhotos.length < (loc.photos || []).length) {
          updates.photos = newPhotos;
          updated = true;
        }
      } else if (report.content_type === "video" && report.content_url) {
        const newVideos = (loc.videos || []).filter(url => url !== report.content_url);
        if (newVideos.length < (loc.videos || []).length) {
          updates.videos = newVideos;
          updated = true;
        }
      }

      if (Object.keys(updates).length > 0) {
        await base44.entities.UserLocation.update(loc.id, updates);
      }

      // 3. Mark report as resolved
      await base44.entities.Report.update(report.id, { status: "resolved" });

      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      queryClient.invalidateQueries({ queryKey: ["allVisibleUsers"] });
      queryClient.invalidateQueries({ queryKey: ["nearbyUsers"] });

      if (updated) {
        toast.success(`Content deleted and report resolved.`);
      } else {
        toast.success("Report resolved. (Content may have already been removed.)");
      }
    } catch (err) {
      toast.error("Failed: " + err.message);
    } finally {
      setActingOn(null);
    }
  };

  const handleBanUser = async () => {
    if (!banTarget) return;
    setActingOn(banTarget.reportId + "-ban");
    setBanTarget(null);
    try {
      const res = await base44.functions.invoke("banUser", { targetUserId: banTarget.userId });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      toast.success(`${banTarget.userName} has been banned and all their content removed.`);
    } catch (err) {
      toast.error("Ban failed: " + err.message);
    } finally {
      setActingOn(null);
    }
  };

  const handleDismiss = async (report) => {
    setActingOn(report.id + "-dismiss");
    try {
      await base44.entities.Report.update(report.id, { status: "dismissed" });
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
      toast.success("Report dismissed.");
    } catch (err) {
      toast.error("Failed: " + err.message);
    } finally {
      setActingOn(null);
    }
  };

  const tabs = [
    { id: "pending", label: "Pending", count: reports.filter(r => r.status === "pending").length },
    { id: "resolved", label: "Resolved" },
    { id: "dismissed", label: "Dismissed" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f2f2ed" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Content Reports</h1>
          <p className="text-xs text-gray-400">Admin review panel</p>
        </div>
        <button
          onClick={() => refetch()}
          className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <RefreshCw className={`h-4 w-4 text-gray-500 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex bg-white rounded-2xl p-1 shadow-sm gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all relative ${
                filter === tab.id ? "bg-primary text-white shadow-sm" : "text-gray-500"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 text-[10px] font-bold ${filter === tab.id ? "opacity-80" : "text-orange-500"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 pb-8 space-y-3 pt-2">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <Flag className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No {filter !== "all" ? filter : ""} reports</p>
          </div>
        )}

        {filtered.map(report => (
          <div key={report.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Report header */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CONTENT_ICONS[report.content_type] || "📋"}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900 capitalize">{report.content_type} Report</p>
                    <p className="text-xs text-gray-400">
                      {new Date(report.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[report.status] || STATUS_COLORS.pending}`}>
                  {report.status}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="px-4 py-3 space-y-2.5">
              {/* Reason */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 w-20 shrink-0">Reason</span>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">{report.reason}</span>
              </div>

              {/* Reported user */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 w-20 shrink-0">Reported</span>
                <div className="flex items-center gap-1.5">
                  <UserAvatar name={report.reported_user_name} size="sm" colorIndex={report.reported_user_id?.charCodeAt(0) || 0} />
                  <span className="text-xs text-gray-700 font-medium">{report.reported_user_name || report.reported_user_id?.slice(0, 8)}</span>
                </div>
              </div>

              {/* Reporter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 w-20 shrink-0">Reporter</span>
                <span className="text-xs text-gray-500">{report.reporter_email || report.reporter_id?.slice(0, 8)}</span>
              </div>

              {/* Notes */}
              {report.notes && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-gray-400 w-20 shrink-0 pt-0.5">Notes</span>
                  <p className="text-xs text-gray-600 italic">"{report.notes}"</p>
                </div>
              )}

              {/* Content preview */}
              {report.content_url && (report.content_type === "photo" || report.content_type === "video") && (
                <div className="mt-2 rounded-xl overflow-hidden bg-gray-100 max-h-48">
                  {report.content_type === "photo" ? (
                    <img src={report.content_url} alt="Reported content" className="w-full max-h-48 object-cover" />
                  ) : (
                    <video src={report.content_url} controls className="w-full max-h-48" />
                  )}
                </div>
              )}

              {report.content_preview && (
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-xs text-gray-600 italic">"{report.content_preview}"</p>
                </div>
              )}
            </div>

            {/* Actions — only for non-resolved/dismissed */}
            {(report.status === "pending" || report.status === "reviewed") && (
              <div className="px-4 pb-4 space-y-2">
                <div className="flex gap-2">
                  {(report.content_type === "photo" || report.content_type === "video") && report.content_url && (
                    <button
                      onClick={() => handleDeleteContent(report)}
                      disabled={!!actingOn}
                      className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}
                    >
                      {actingOn === report.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete Content
                    </button>
                  )}
                  <button
                    onClick={() => handleDismiss(report)}
                    disabled={!!actingOn}
                    className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {actingOn === report.id + "-dismiss" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Dismiss
                  </button>
                </div>
                {/* Ban user — full width, destructive */}
                <button
                  onClick={() => setBanTarget({ userId: report.reported_user_id, userName: report.reported_user_name || "this user", reportId: report.id })}
                  disabled={!!actingOn}
                  className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {actingOn === report.id + "-ban" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Ban User & Delete All Content
                </button>
              </div>
            )}

            {report.status === "resolved" && (
              <div className="px-4 pb-3 flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-semibold">Content removed & resolved</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Ban confirmation dialog */}
      <AlertDialog open={!!banTarget} onOpenChange={(open) => { if (!open) setBanTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban {banTarget?.userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete their account, all photos, videos, messages, friend connections, and hangouts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBanUser} className="bg-red-600 hover:bg-red-700 text-white">
              Yes, Ban & Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
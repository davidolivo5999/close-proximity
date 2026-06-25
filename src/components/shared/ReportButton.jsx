import React, { useState } from "react";
import { Flag, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const REASONS = ["Inappropriate", "Harassment", "Spam", "Nudity", "Hate Speech", "Other"];

/**
 * ReportButton — drop-in report/flag button for any content type.
 *
 * Props:
 *   currentUser     — the logged-in user object (null = hidden)
 *   reportedUserId  — ID of the user being reported
 *   reportedUserName— display name of reported user
 *   contentType     — "profile" | "photo" | "video" | "message"
 *   contentUrl      — URL of photo/video (optional)
 *   contentPreview  — short text snippet for messages (optional)
 *   iconOnly        — if true, renders just a small flag icon button
 */
export default function ReportButton({
  currentUser,
  reportedUserId,
  reportedUserName,
  contentType = "profile",
  contentUrl = null,
  contentPreview = null,
  iconOnly = false,
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (currentUser && currentUser.id === reportedUserId) return null;

  const handleSubmit = async () => {
    if (!reason || !currentUser) return;
    setSubmitting(true);
    try {
      await base44.entities.Report.create({
        reporter_id: currentUser.id,
        reporter_email: currentUser.email || "",
        reported_user_id: reportedUserId,
        reported_user_name: reportedUserName || "",
        content_type: contentType,
        content_url: contentUrl || "",
        content_preview: contentPreview || "",
        reason,
        notes,
        status: "pending",
      });
      toast.success("Report submitted. Thank you — we'll review it promptly.");
      setOpen(false);
      setReason("");
      setNotes("");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {iconOnly ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors"
          title="Report"
        >
          <Flag className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
        >
          <Flag className="h-4 w-4" />
          Report
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Sheet */}
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-red-100 flex items-center justify-center">
                  <Flag className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Report {contentType}</p>
                  {reportedUserName && (
                    <p className="text-xs text-gray-400">{reportedUserName}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <p className="text-sm font-semibold text-gray-700 mb-2">Why are you reporting this?</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
                    reason === r
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional details (optional)..."
              rows={2}
              maxLength={300}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="w-full h-11 rounded-2xl font-semibold text-white text-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
              Submit Report
            </button>
          </div>
        </div>
      )}
    </>
  );
}
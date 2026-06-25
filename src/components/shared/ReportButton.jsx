import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Flag, X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const REASONS = ["Inappropriate", "Harassment", "Spam", "Nudity", "Hate Speech", "Other"];

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

      // Auto-block the reported user
      await base44.entities.Block.create({
        blocker_id: currentUser.id,
        blocked_id: reportedUserId,
      });

      // Remove any accepted friend requests between the two users
      const friendships = await base44.entities.FriendRequest.filter({
        status: "accepted",
        $or: [
          { from_user_id: currentUser.id, to_user_id: reportedUserId },
          { from_user_id: reportedUserId, to_user_id: currentUser.id },
        ],
      });
      await Promise.all(friendships.map(f => base44.entities.FriendRequest.delete(f.id)));

      toast.success("Report submitted. The user has been blocked and removed from your friends.");
      setOpen(false);
      setReason("");
      setNotes("");
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = open ? createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)" }}
        onClick={() => setOpen(false)}
      />

      {/* Sheet — slides down from the top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          maxWidth: 480,
          margin: "0 auto",
          background: "#fff",
          borderRadius: "0 0 1.5rem 1.5rem",
          boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* Scrollable content */}
        <div style={{ overflowY: "auto", maxHeight: "60vh", padding: "1.25rem 1.25rem 0" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 32, height: 32, borderRadius: "0.75rem", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Flag style={{ width: 16, height: 16, color: "#ef4444" }} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#111" }}>Report {contentType}</p>
                {reportedUserName && <p style={{ fontSize: 12, color: "#9ca3af" }}>{reportedUserName}</p>}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ width: 32, height: 32, borderRadius: "50%", background: "#f3f4f6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <X style={{ width: 16, height: 16, color: "#6b7280" }} />
            </button>
          </div>

          {/* Reason label */}
          <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>Why are you reporting this?</p>

          {/* Reason pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
            {REASONS.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                style={{
                  padding: "0.375rem 0.875rem",
                  borderRadius: "9999px",
                  fontSize: 14,
                  fontWeight: 500,
                  border: reason === r ? "2px solid #fb923c" : "2px solid #e5e7eb",
                  background: reason === r ? "#fff7ed" : "#fff",
                  color: reason === r ? "#c2410c" : "#4b5563",
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Additional details (optional)..."
            rows={2}
            maxLength={300}
            style={{
              width: "100%",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              padding: "0.5rem 0.75rem",
              fontSize: 14,
              color: "#1f2937",
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Submit button — always visible */}
        <div style={{ padding: "1rem 1.25rem", paddingBottom: "1.25rem", background: "#fff", borderTop: "1px solid #f3f4f6" }}>
          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            style={{
              width: "100%",
              height: 48,
              borderRadius: "1rem",
              fontWeight: 600,
              color: "#fff",
              fontSize: 14,
              border: "none",
              background: "linear-gradient(135deg, #f97316, #ec4899)",
              opacity: (!reason || submitting) ? 0.4 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              cursor: (!reason || submitting) ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Flag style={{ width: 16, height: 16 }} />}
            Submit Report
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

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

      {modal}
    </>
  );
}
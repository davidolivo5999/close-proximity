import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportReport({ userId }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!userId) return;
    setLoading(true);

    // Fetch all hangouts the user hosted or attended
    const [hosted, allHangouts] = await Promise.all([
      base44.entities.Hangout.filter({ host_id: userId }),
      base44.entities.Hangout.list("-created_date", 500),
    ]);

    const attended = allHangouts.filter(
      (h) => (h.attendee_ids || []).includes(userId) && h.host_id !== userId
    );

    const allMyHangouts = [
      ...hosted.map((h) => ({ ...h, role: "host" })),
      ...attended.map((h) => ({ ...h, role: "attendee" })),
    ].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    // Sheet 1: Hangout log
    const hangoutRows = allMyHangouts.map((h) => ({
      Date: format(new Date(h.created_date), "yyyy-MM-dd"),
      Title: h.title,
      Emoji: h.emoji || "",
      Role: h.role,
      Attendees: (h.attendee_ids || []).length,
      "Checked In": (h.checked_in_ids || []).length,
      "Duration (hrs)": h.duration_hours || "",
      "Expires At": h.expires_at ? format(new Date(h.expires_at), "yyyy-MM-dd HH:mm") : "",
    }));

    // Sheet 2: Monthly growth summary (last 6 months)
    const monthRows = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const inMonth = allMyHangouts.filter((h) => {
        const cd = new Date(h.created_date);
        return cd >= start && cd <= end;
      });
      return {
        Month: format(d, "MMMM yyyy"),
        "Hangouts Hosted": inMonth.filter((h) => h.role === "host").length,
        "Hangouts Attended": inMonth.filter((h) => h.role === "attendee").length,
        "Total Attendees Attracted": inMonth
          .filter((h) => h.role === "host")
          .reduce((s, h) => s + (h.attendee_ids?.length || 0), 0),
        "Total Check-ins": inMonth.reduce(
          (s, h) => s + (h.checked_in_ids?.length || 0), 0
        ),
      };
    });

    // Combine into one CSV with a separator
    const csv = [
      "=== HANGOUT LOG ===",
      toCSV(hangoutRows.length ? hangoutRows : [{ Note: "No hangouts yet" }]),
      "",
      "=== MONTHLY SUMMARY (Last 6 Months) ===",
      toCSV(monthRows),
    ].join("\n");

    downloadCSV(
      `vibecheck-report-${format(new Date(), "yyyy-MM")}.csv`,
      csv
    );

    toast.success("Report downloaded!");
    setLoading(false);
  };

  return (
    <Button
      variant="outline"
      className="w-full rounded-xl gap-2"
      onClick={handleExport}
      disabled={loading}
    >
      <Download className="h-4 w-4" />
      {loading ? "Generating report..." : "Export Monthly Report (.csv)"}
    </Button>
  );
}
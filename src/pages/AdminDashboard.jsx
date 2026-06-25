import React, { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Users, UserPlus, MessageCircle, Flag, ShieldCheck, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

function getDayLabel(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function bucketByDay(records, dateField, days = 14) {
  const counts = {};
  for (let i = days - 1; i >= 0; i--) {
    counts[getDayLabel(i)] = 0;
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  records.forEach((r) => {
    const d = new Date(r[dateField]);
    if (d < cutoff) return;
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (label in counts) counts[label]++;
  });

  return Object.entries(counts).map(([day, count]) => ({ day, count }));
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
      </div>
    </div>
  );
}

function MiniChart({ data, color, label }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-bold text-gray-900 mb-3">{label} — last 14 days</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "#9ca3af" }}
            interval={1}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
            cursor={{ fill: "#f9fafb" }}
          />
          <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const cutoff14 = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString();
  }, []);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const { data: allLocations = [] } = useQuery({
    queryKey: ["adminAllLocations"],
    queryFn: () => base44.entities.UserLocation.list("-created_date", 500),
    enabled: user?.role === "admin",
    staleTime: 60 * 1000,
  });

  const { data: recentLocations = [] } = useQuery({
    queryKey: ["adminRecentLocations"],
    queryFn: () => base44.entities.UserLocation.filter({ updated_date: { $gte: cutoff14 } }, "-updated_date", 500),
    enabled: user?.role === "admin",
    staleTime: 60 * 1000,
  });

  const { data: recentRequests = [] } = useQuery({
    queryKey: ["adminRecentRequests"],
    queryFn: () => base44.entities.FriendRequest.filter({ created_date: { $gte: cutoff14 } }, "-created_date", 500),
    enabled: user?.role === "admin",
    staleTime: 60 * 1000,
  });

  const { data: recentMessages = [] } = useQuery({
    queryKey: ["adminRecentMessages"],
    queryFn: () => base44.entities.DirectMessage.filter({ created_date: { $gte: cutoff14 } }, "-created_date", 500),
    enabled: user?.role === "admin",
    staleTime: 60 * 1000,
  });

  const { data: pendingReports = [] } = useQuery({
    queryKey: ["adminPendingReports"],
    queryFn: () => base44.entities.Report.filter({ status: "pending" }, "-created_date", 100),
    enabled: user?.role === "admin",
    staleTime: 30 * 1000,
  });

  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 text-center">
        <ShieldCheck className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">Admin access only</p>
      </div>
    );
  }

  // Daily active users = unique user_ids with an updated_date today
  const todayActiveIds = new Set(
    allLocations
      .filter((l) => new Date(l.updated_date) >= new Date(today))
      .map((l) => l.user_id)
  );

  // 14-day charts
  const dauData = bucketByDay(recentLocations, "updated_date");
  const requestsData = bucketByDay(recentRequests, "created_date");

  // Totals for stat cards
  const totalUsers = new Set(allLocations.map((l) => l.user_id)).size;
  const requestsToday = recentRequests.filter((r) => new Date(r.created_date) >= new Date(today)).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f2f2ed" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center gap-3 safe-area-top">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs text-gray-400">Community growth overview</p>
        </div>
        <Link to="/admin/reports" className="h-9 px-3 rounded-full bg-orange-100 flex items-center gap-1.5 text-orange-600 text-xs font-semibold">
          <Flag className="h-3.5 w-3.5" />
          Reports
          {pendingReports.length > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
              {pendingReports.length}
            </span>
          )}
        </Link>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-3">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Users className="h-5 w-5 text-blue-600" />}
            label="Total users"
            value={totalUsers}
            color="bg-blue-100"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            label="Active today"
            value={todayActiveIds.size}
            color="bg-emerald-100"
          />
          <StatCard
            icon={<UserPlus className="h-5 w-5 text-violet-600" />}
            label="Requests today"
            value={requestsToday}
            color="bg-violet-100"
          />
          <StatCard
            icon={<MessageCircle className="h-5 w-5 text-orange-500" />}
            label="Messages (14d)"
            value={recentMessages.length}
            color="bg-orange-100"
          />
        </div>

        {/* DAU chart */}
        <MiniChart data={dauData} color="#3b82f6" label="Daily Active Users" />

        {/* Friend requests chart */}
        <MiniChart data={requestsData} color="#8b5cf6" label="New Friend Requests" />
      </div>
    </div>
  );
}
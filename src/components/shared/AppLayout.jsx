import React from "react";
import { Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BottomNav from "./BottomNav";

export default function AppLayout() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["pendingRequests", user?.id],
    queryFn: () =>
      base44.entities.FriendRequest.filter({
        to_user_id: user.id,
        status: "pending",
      }),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto pb-24">
        <Outlet />
      </div>
      <BottomNav pendingCount={pendingRequests.length} />
    </div>
  );
}
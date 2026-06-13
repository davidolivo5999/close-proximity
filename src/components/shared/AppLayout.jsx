import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BottomNav from "./BottomNav";
import { useTabHistory, TAB_ROOTS } from "@/lib/TabHistoryContext";

function getTabRoot(pathname) {
  if (pathname === "/") return "/";
  for (const root of TAB_ROOTS) {
    if (root !== "/" && pathname.startsWith(root)) return root;
  }
  return null;
}

export default function AppLayout() {
  const location = useLocation();
  const { setTabPath } = useTabHistory();

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

  // Track the current path under each tab so we can restore it
  useEffect(() => {
    const tabRoot = location.state?.__tab || getTabRoot(location.pathname);
    if (tabRoot) {
      setTabPath(tabRoot, location.pathname);
    }
  }, [location.pathname, location.state, setTabPath]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto pb-24">
        <Outlet />
      </div>
      <BottomNav pendingCount={pendingRequests.length} />
    </div>
  );
}
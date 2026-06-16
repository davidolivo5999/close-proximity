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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: myLocation } = useQuery({
    queryKey: ["myLocation", user?.id],
    queryFn: async () => {
      const locs = await base44.entities.UserLocation.filter({ user_id: user.id });
      if (locs.length === 0) return null;
      // Same sort as Nearby so both share the same cache correctly
      const sorted = [...locs].sort((a, b) => {
        const aScore = (a.photos?.length || 0) + (a.avatar_url ? 10 : 0);
        const bScore = (b.photos?.length || 0) + (b.avatar_url ? 10 : 0);
        if (bScore !== aScore) return bScore - aScore;
        return new Date(b.updated_date) - new Date(a.updated_date);
      });
      return sorted[0];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["pendingRequests", user?.id],
    queryFn: () =>
      base44.entities.FriendRequest.filter({
        to_user_id: user.id,
        status: "pending",
      }),
    enabled: !!user?.id,
    refetchInterval: 60000,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unreadMessages", user?.id],
    queryFn: () => base44.entities.DirectMessage.filter({ to_user_id: user.id, read: false }),
    enabled: !!user?.id,
    refetchInterval: 60000,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Track the current path under each tab so we can restore it
  useEffect(() => {
    const tabRoot = location.state?.__tab || getTabRoot(location.pathname);
    if (tabRoot) {
      setTabPath(tabRoot, location.pathname);
    }
  }, [location.pathname, location.state, setTabPath]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Scrollable content area — overscroll-contain prevents bubble to body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain" }}
      >
        <div className="max-w-lg mx-auto pb-24 safe-area-top" style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}>
          <Outlet />
        </div>
      </div>
      <BottomNav pendingCount={pendingRequests.length} unreadMessages={unreadMessages.length} currentUser={user} userAvatarUrl={myLocation?.avatar_url} />
    </div>
  );
}
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
    refetchInterval: 60000,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unreadMessages", user?.id],
    queryFn: () => base44.entities.DirectMessage.filter({ to_user_id: user.id, read: false }),
    enabled: !!user?.id,
    refetchInterval: 60000,
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
      <BottomNav pendingCount={pendingRequests.length} unreadMessages={unreadMessages.length} />
    </div>
  );
}
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Radar, Users, Bell, UserCircle, MessageCircle, Compass } from "lucide-react";
import { useTabHistory, TAB_ROOTS } from "@/lib/TabHistoryContext";
import UserAvatar from "@/components/shared/UserAvatar";

const NAV_ITEMS = [
  { path: "/", icon: Radar, label: "Nearby" },
  { path: "/friends", icon: Users, label: "Friends" },
  { path: "/explore", icon: Compass, label: "Explore" },
  { path: "/messages", icon: MessageCircle, label: "Messages" },
  { path: "/profile", icon: UserCircle, label: "Profile" },
];

function getActiveTab(pathname) {
  if (pathname === "/") return "/";
  for (const root of TAB_ROOTS) {
    if (root !== "/" && pathname.startsWith(root)) return root;
  }
  // For /user/:id, check navigation state — fall back to "/"
  return "/";
}

export default function BottomNav({ pendingCount = 0, unreadMessages = 0, currentUser = null, userAvatarUrl = null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { getTabPath } = useTabHistory();

  const activeTab = location.state?.__tab || getActiveTab(location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border safe-area-bottom" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = activeTab === path;
          return (
            <button
              key={path}
              onClick={() => navigate(getTabPath(path), { state: { __tab: path } })}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                {label === "Profile" && (userAvatarUrl || currentUser) ? (
                  <div className={`h-5 w-5 rounded-full overflow-hidden ring-2 transition-all duration-200 ${isActive ? "ring-primary scale-110" : "ring-transparent"}`}>
                    <img
                      src={userAvatarUrl}
                      alt="me"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = "none"; e.target.parentElement.classList.add("bg-primary"); }}
                    />
                  </div>
                ) : (
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                )}
                {label === "Requests" && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
                {label === "Messages" && unreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                    {unreadMessages}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <div className="absolute -bottom-2 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
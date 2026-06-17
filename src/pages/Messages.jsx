import React, { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/shared/UserAvatar";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Messages() {
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: sent = [] } = useQuery({
    queryKey: ["dms-sent", user?.id],
    queryFn: () => base44.entities.DirectMessage.filter({ from_user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: received = [] } = useQuery({
    queryKey: ["dms-received", user?.id],
    queryFn: () => base44.entities.DirectMessage.filter({ to_user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Real-time updates instead of polling
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.from_user_id === user.id) {
        queryClient.invalidateQueries({ queryKey: ["dms-sent", user.id] });
      } else if (msg.to_user_id === user.id) {
        queryClient.invalidateQueries({ queryKey: ["dms-received", user.id] });
      }
    });
    return () => unsub();
  }, [user?.id, queryClient]);

  // Build conversation list: one entry per unique peer
  const conversations = useMemo(() => {
    if (!user) return [];
    const all = [...sent, ...received];
    const map = new Map();
    for (const msg of all) {
      const peerId = msg.from_user_id === user.id ? msg.to_user_id : msg.from_user_id;
      const peerName = msg.from_user_id === user.id ? msg.to_user_name : msg.from_user_name;
      const existing = map.get(peerId);
      if (!existing || new Date(msg.created_date) > new Date(existing.lastDate)) {
        map.set(peerId, {
          peerId,
          peerName,
          lastText: msg.text,
          lastDate: msg.created_date,
          unread: received.filter((m) => m.from_user_id === peerId && !m.read).length,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
  }, [sent, received, user]);

  const peerIds = conversations.map((c) => c.peerId);
  const { data: allLocations = [] } = useQuery({
    queryKey: ["allUserLocations", peerIds.join(",")],
    queryFn: () => peerIds.length > 0 ? base44.entities.UserLocation.filter({ user_id: { $in: peerIds } }) : Promise.resolve([]),
    enabled: peerIds.length > 0,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });
  const peerAvatarMap = useMemo(() => {
    const map = {};
    for (const loc of allLocations) {
      if (peerIds.includes(loc.user_id) && loc.avatar_url) map[loc.user_id] = loc.avatar_url;
    }
    return map;
  }, [allLocations, peerIds]);

  const peerNameMap = useMemo(() => {
    const map = {};
    for (const loc of allLocations) {
      if (peerIds.includes(loc.user_id) && loc.user_name) map[loc.user_id] = loc.user_name;
    }
    return map;
  }, [allLocations, peerIds]);

  return (
    <div>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3 safe-area-top">
        <h1 className="text-2xl font-heading font-bold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">Direct conversations</p>
      </div>

      <div className="px-5 pt-4">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No messages yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Start a conversation from someone's profile page.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv, i) => (
              <button
                key={conv.peerId}
                onClick={() => navigate(`/messages/${conv.peerId}`, { state: { peerName: peerNameMap[conv.peerId] || conv.peerName, peerAvatarUrl: peerAvatarMap[conv.peerId] } })}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/60 transition-colors text-left"
              >
                <UserAvatar name={peerNameMap[conv.peerId] || conv.peerName} size="md" colorIndex={i} avatarUrl={peerAvatarMap[conv.peerId]} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground truncate">{peerNameMap[conv.peerId] || conv.peerName}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastText}</p>
                </div>
                {conv.unread > 0 && (
                  <span className="h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                    {conv.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
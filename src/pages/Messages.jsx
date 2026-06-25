import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/shared/UserAvatar";
import { MessageCircle, Users, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import NewGroupChatDialog from "@/components/messages/NewGroupChatDialog";

export default function Messages() {
  const navigate = useNavigate();
  const [showNewGroup, setShowNewGroup] = useState(false);

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

  const { data: groupChats = [] } = useQuery({
    queryKey: ["groupChats", user?.id],
    queryFn: () => base44.entities.GroupChat.filter({ member_ids: user.id }, "-last_message_at", 50),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <div>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">Messages</h1>
            <p className="text-sm text-muted-foreground">Direct &amp; group conversations</p>
          </div>
          <button
            onClick={() => setShowNewGroup(true)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold text-primary-foreground"
            style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Group
          </button>
        </div>
      </div>

      <div className="px-5 pt-4">
        {/* Group chats */}
        {groupChats.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Group Chats
            </p>
            <div className="space-y-1">
              {groupChats.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/group/${g.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground block truncate">{g.name}</span>
                    <p className="text-sm text-muted-foreground truncate">{g.last_message || `${g.member_ids?.length} members`}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Direct messages section label if both exist */}
        {groupChats.length > 0 && conversations.length > 0 && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" /> Direct Messages
          </p>
        )}

        {conversations.length === 0 && groupChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No messages yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Start a conversation from someone's profile, or create a group chat with your friends.
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

      {showNewGroup && (
        <NewGroupChatDialog
          currentUser={user}
          onClose={() => setShowNewGroup(false)}
          onCreate={(group) => {
            setShowNewGroup(false);
            queryClient.invalidateQueries({ queryKey: ["groupChats", user?.id] });
            navigate(`/group/${group.id}`);
          }}
        />
      )}
    </div>
  );
}
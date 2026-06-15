import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  });

  const { data: sent = [] } = useQuery({
    queryKey: ["dms-sent", user?.id],
    queryFn: () => base44.entities.DirectMessage.filter({ from_user_id: user.id }),
    enabled: !!user?.id,
    refetchInterval: 8000,
  });

  const { data: received = [] } = useQuery({
    queryKey: ["dms-received", user?.id],
    queryFn: () => base44.entities.DirectMessage.filter({ to_user_id: user.id }),
    enabled: !!user?.id,
    refetchInterval: 8000,
  });

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
                onClick={() => navigate(`/messages/${conv.peerId}`, { state: { peerName: conv.peerName } })}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/60 transition-colors text-left"
              >
                <UserAvatar name={conv.peerName} size="md" colorIndex={i} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground truncate">{conv.peerName}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(conv.lastDate), { addSuffix: true })}
                    </span>
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
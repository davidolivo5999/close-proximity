import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/shared/UserAvatar";
import ReportButton from "@/components/shared/ReportButton";
import { format } from "date-fns";

export default function Conversation() {
  const { peerId } = useParams();
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [text, setText] = useState("");

  const peerNameFromState = routerLocation.state?.peerName;
  const peerAvatarUrlFromState = routerLocation.state?.peerAvatarUrl;

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Redirect away if this peer is blocked (either direction)
  const { data: isBlocked } = useQuery({
    queryKey: ["isBlocked", user?.id, peerId],
    queryFn: async () => {
      const [blocked, blockedBy] = await Promise.all([
        base44.entities.Block.filter({ blocker_id: user.id, blocked_id: peerId }),
        base44.entities.Block.filter({ blocker_id: peerId, blocked_id: user.id }),
      ]);
      return blocked.length > 0 || blockedBy.length > 0;
    },
    enabled: !!user?.id && !!peerId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isBlocked) navigate("/messages", { replace: true });
  }, [isBlocked, navigate]);

  // Fetch current user's location for display name
  const { data: myLocation } = useQuery({
    queryKey: ["myLocation", user?.id],
    queryFn: async () => {
      const results = await base44.entities.UserLocation.filter({ user_id: user.id });
      return results[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Fetch peer location only if name not in state
  const { data: peerLocation } = useQuery({
    queryKey: ["peerProfile", peerId],
    queryFn: async () => {
      const results = await base44.entities.UserLocation.filter({ user_id: peerId });
      return results[0] || null;
    },
    enabled: !!peerId && !peerNameFromState && !peerAvatarUrlFromState,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const peerName = peerNameFromState || peerLocation?.user_name || "User";
  const peerAvatarUrl = peerAvatarUrlFromState || peerLocation?.avatar_url || null;
  const myDisplayName = myLocation?.user_name || user?.full_name;

  const { data: sent = [] } = useQuery({
    queryKey: ["conv-sent", user?.id, peerId],
    queryFn: () => base44.entities.DirectMessage.filter({ from_user_id: user.id, to_user_id: peerId }),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: received = [] } = useQuery({
    queryKey: ["conv-received", user?.id, peerId],
    queryFn: () => base44.entities.DirectMessage.filter({ from_user_id: peerId, to_user_id: user.id }),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Real-time updates instead of polling
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.DirectMessage.subscribe((event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.from_user_id === user.id && msg.to_user_id === peerId) {
        queryClient.invalidateQueries({ queryKey: ["conv-sent", user.id, peerId] });
      } else if (msg.from_user_id === peerId && msg.to_user_id === user.id) {
        queryClient.invalidateQueries({ queryKey: ["conv-received", user.id, peerId] });
        queryClient.invalidateQueries({ queryKey: ["dms-received", user.id] });
      }
    });
    return () => unsub();
  }, [user?.id, peerId, queryClient]);

  const messages = [...sent, ...received].sort(
    (a, b) => new Date(a.created_date) - new Date(b.created_date)
  );

  // ID of the last sent message that has been read by the peer
  const lastReadSentId = [...sent]
    .filter((m) => m.read && !m._optimistic)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]?.id;

  useEffect(() => {
    if (messages.length === 0) return;
    const scrollToBottom = () => {
      const container = messagesContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    };
    // Run after layout settles, and again shortly after in case images/fonts shift height
    const raf = requestAnimationFrame(scrollToBottom);
    const timeout = setTimeout(scrollToBottom, 300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [messages]);

  const sendMsg = useMutation({
    mutationFn: (msgText) =>
      base44.entities.DirectMessage.create({
        from_user_id: user.id,
        to_user_id: peerId,
        from_user_name: myDisplayName,
        to_user_name: peerName,
        text: msgText,
        read: false,
      }),
    onMutate: (msgText) => {
      const optimistic = {
        id: `opt-${Date.now()}`,
        from_user_id: user.id,
        to_user_id: peerId,
        text: msgText,
        created_date: new Date().toISOString(),
        _optimistic: true,
      };
      queryClient.setQueryData(["conv-sent", user?.id, peerId], (prev = []) => [...prev, optimistic]);
      setText("");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conv-sent", user?.id, peerId] });
      queryClient.invalidateQueries({ queryKey: ["dms-sent", user?.id] });
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMsg.mutate(trimmed);
  };

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex flex-col bg-white">
      {/* Row 1: Header */}
      <div className="flex-none flex items-center gap-3 px-4 py-3 border-b border-border safe-area-top">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <UserAvatar name={peerName} size="sm" colorIndex={peerId.charCodeAt(0)} avatarUrl={peerAvatarUrl} />
        <span className="font-semibold text-foreground flex-1">{peerName}</span>
        <ReportButton
          currentUser={user}
          reportedUserId={peerId}
          reportedUserName={peerName}
          contentType="message"
          iconOnly
        />
      </div>

      {/* Row 2: Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.from_user_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                } ${msg._optimistic ? "opacity-70" : ""}`}
              >
                <p>{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_date), "h:mm a")}
                </p>
              </div>
              {isMe && msg.id === lastReadSentId && (
                <div className="flex items-center gap-1 mt-0.5 justify-end">
                  <CheckCheck className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground">Read</span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Row 3: Input bar */}
      <div className="flex-none flex items-center gap-2 p-3 border-t border-border safe-area-bottom">
        <input
          className="flex-1 bg-muted rounded-full px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
          style={{ fontSize: "16px" }}
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button
          size="icon"
          className="rounded-full h-10 w-10 shrink-0 bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
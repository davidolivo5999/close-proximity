import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/shared/UserAvatar";
import { format } from "date-fns";

export default function GroupConversation() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [text, setText] = useState("");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: group } = useQuery({
    queryKey: ["groupChat", groupId],
    queryFn: () => base44.entities.GroupChat.get(groupId),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["groupMessages", groupId],
    queryFn: () => base44.entities.GroupMessage.filter({ group_id: groupId }, "created_date", 200),
    enabled: !!groupId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.GroupMessage.subscribe((event) => {
      if (event.data?.group_id === groupId) {
        queryClient.invalidateQueries({ queryKey: ["groupMessages", groupId] });
      }
    });
    return () => unsub();
  }, [groupId, queryClient]);

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

  const { data: myLocation } = useQuery({
    queryKey: ["myLocation", user?.id],
    queryFn: async () => {
      const r = await base44.entities.UserLocation.filter({ user_id: user.id });
      return r[0] || null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const myDisplayName = myLocation?.user_name || user?.full_name;

  const sendMsg = useMutation({
    mutationFn: (msgText) =>
      base44.entities.GroupMessage.create({
        group_id: groupId,
        from_user_id: user.id,
        from_user_name: myDisplayName,
        text: msgText,
      }),
    onMutate: (msgText) => {
      const optimistic = {
        id: `opt-${Date.now()}`,
        group_id: groupId,
        from_user_id: user.id,
        from_user_name: myDisplayName,
        text: msgText,
        created_date: new Date().toISOString(),
        _optimistic: true,
      };
      queryClient.setQueryData(["groupMessages", groupId], (prev = []) => [...prev, optimistic]);
      setText("");
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["groupMessages", groupId] });
      // Update last message on group
      await base44.entities.GroupChat.update(groupId, {
        last_message: text.trim(),
        last_message_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["groupChats", user?.id] });
    },
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMsg.mutate(trimmed);
  };

  const memberCount = group?.member_ids?.length || 0;
  const otherMembers = (group?.member_names || []).filter((_, i) => group?.member_ids?.[i] !== user?.id);

  // iOS Safari doesn't resize the layout viewport when the keyboard opens,
  // which can leave fixed-position elements hidden behind the keyboard or
  // misaligned with actual taps. Track the visual viewport height instead.
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 0
  );
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleResize = () => setViewportHeight(vv.height);
    handleResize();
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex flex-col bg-background"
      style={{ height: viewportHeight }}
    >
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center gap-3 safe-area-top">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{group?.name || "Group Chat"}</p>
          <p className="text-xs text-muted-foreground truncate">{memberCount} members · {otherMembers.slice(0, 2).join(", ")}{otherMembers.length > 2 ? "…" : ""}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.from_user_id === user?.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && (
                <div className="flex items-center gap-1.5 mb-1">
                  <UserAvatar name={msg.from_user_name} size="sm" colorIndex={msg.from_user_id?.charCodeAt(0) || 0} />
                  <span className="text-xs font-semibold text-muted-foreground">{msg.from_user_name}</span>
                </div>
              )}
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
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background px-4 py-3 flex items-center gap-2 safe-area-bottom">
        <input
          className="flex-1 bg-muted rounded-full px-4 py-2.5 outline-none focus:ring-1 focus:ring-primary"
          style={{ fontSize: "16px" }}
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button
          size="icon"
          className="rounded-full h-10 w-10 shrink-0"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
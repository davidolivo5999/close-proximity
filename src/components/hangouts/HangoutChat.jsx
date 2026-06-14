import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/shared/UserAvatar";
import { formatDistanceToNow } from "date-fns";

const REACTIONS = ["👍", "🔥", "😂", "❤️", "🎉"];

export default function HangoutChat({ hangoutId, currentUser }) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [showReactions, setShowReactions] = useState(null); // msg id
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  // Initial load
  useEffect(() => {
    base44.entities.HangoutMessage.filter({ hangout_id: hangoutId }, "created_date", 100)
      .then(setMessages);
  }, [hangoutId]);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.HangoutMessage.subscribe((event) => {
      if (event.data?.hangout_id !== hangoutId) return;
      if (event.type === "create") {
        setMessages((prev) => [...prev, event.data]);
      } else if (event.type === "update") {
        setMessages((prev) => prev.map((m) => m.id === event.id ? event.data : m));
      } else if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.id));
      }
    });
    return unsub;
  }, [hangoutId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: () =>
      base44.entities.HangoutMessage.create({
        hangout_id: hangoutId,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        text: text.trim(),
      }),
    onSuccess: () => setText(""),
  });

  const addReaction = async (msg, emoji) => {
    setShowReactions(null);
    const current = msg.reactions || {};
    const users = current[emoji] || [];
    const alreadyReacted = users.includes(currentUser.id);
    const updated = {
      ...current,
      [emoji]: alreadyReacted
        ? users.filter((id) => id !== currentUser.id)
        : [...users, currentUser.id],
    };
    // Remove key if empty
    if (updated[emoji].length === 0) delete updated[emoji];
    await base44.entities.HangoutMessage.update(msg.id, { reactions: updated });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) sendMessage.mutate();
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Messages */}
      <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1 mb-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No messages yet — say hi! 👋
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === currentUser?.id;
          const reactions = msg.reactions || {};
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && (
                <UserAvatar
                  name={msg.user_name}
                  size="sm"
                  colorIndex={msg.user_id?.charCodeAt(0) || 0}
                />
              )}
              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
                {!isMe && (
                  <span className="text-[10px] text-muted-foreground ml-1">{msg.user_name}</span>
                )}

                <div className="relative group">
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-sm leading-snug cursor-default ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Reaction trigger */}
                  <button
                    className="absolute -bottom-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-full p-0.5 shadow-sm z-10"
                    onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                  >
                    <Smile className="h-3 w-3 text-muted-foreground" />
                  </button>

                  {/* Reaction picker */}
                  {showReactions === msg.id && (
                    <div className="absolute bottom-6 right-0 z-20 flex gap-1 bg-background border border-border rounded-2xl px-2 py-1.5 shadow-lg">
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          className="text-base hover:scale-125 transition-transform"
                          onClick={() => addReaction(msg, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reaction counts */}
                {Object.keys(reactions).length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-0.5">
                    {Object.entries(reactions).map(([emoji, users]) =>
                      users.length > 0 ? (
                        <button
                          key={emoji}
                          onClick={() => addReaction(msg, emoji)}
                          className={`flex items-center gap-0.5 text-xs rounded-full px-1.5 py-0.5 border transition-colors ${
                            users.includes(currentUser.id)
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {emoji} <span>{users.length}</span>
                        </button>
                      ) : null
                    )}
                  </div>
                )}

                <span className="text-[10px] text-muted-foreground mx-1">
                  {msg.created_date
                    ? formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })
                    : "just now"}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message the group..."
          className="rounded-xl bg-muted/50 border-0 focus-visible:ring-primary/30 text-sm h-9"
          maxLength={300}
        />
        <Button
          size="icon"
          className="h-9 w-9 rounded-xl flex-shrink-0"
          disabled={!text.trim() || sendMessage.isPending}
          onClick={() => sendMessage.mutate()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
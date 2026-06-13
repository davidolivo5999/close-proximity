import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/shared/UserAvatar";
import { formatDistanceToNow } from "date-fns";

export default function HangoutChat({ hangoutId, currentUser }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["hangoutMessages", hangoutId],
    queryFn: () =>
      base44.entities.HangoutMessage.filter({ hangout_id: hangoutId }, "created_date", 100),
    refetchInterval: 5000,
  });

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
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["hangoutMessages", hangoutId] });
    },
  });

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) sendMessage.mutate();
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      {/* Messages */}
      <div className="flex flex-col gap-2.5 max-h-52 overflow-y-auto pr-1 mb-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3">
            No messages yet — say hi! 👋
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === currentUser?.id;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && (
                <UserAvatar
                  name={msg.user_name}
                  size="sm"
                  colorIndex={msg.user_id?.charCodeAt(0) || 0}
                />
              )}
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                {!isMe && (
                  <span className="text-[10px] text-muted-foreground ml-1">{msg.user_name}</span>
                )}
                <div
                  className={`px-3 py-1.5 rounded-2xl text-sm leading-snug ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
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
          placeholder="Message..."
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
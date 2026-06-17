import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Send, SmilePlus } from "lucide-react";

const QUICK_REACTIONS = [
  { type: "like", emoji: "👍" },
  { type: "love", emoji: "❤️" },
  { type: "fire", emoji: "🔥" },
  { type: "wow", emoji: "😮" },
  { type: "haha", emoji: "😂" },
];

export default function MediaReactions({ mediaUrl, mediaOwnerId, currentUser }) {
  const queryClient = useQueryClient();
  const [showPanel, setShowPanel] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: reactions = [] } = useQuery({
    queryKey: ["mediaReactions", mediaUrl],
    queryFn: () => base44.entities.MediaReaction.filter({ media_url: mediaUrl }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["mediaReactions", mediaUrl] });

  const addReaction = useMutation({
    mutationFn: async (type) => {
      const existing = reactions.find(r => r.user_id === currentUser.id && r.type === type && !r.comment);
      if (existing) {
        await base44.entities.MediaReaction.delete(existing.id);
      } else {
        const prev = reactions.find(r => r.user_id === currentUser.id && !r.comment);
        if (prev) await base44.entities.MediaReaction.delete(prev.id);
        await base44.entities.MediaReaction.create({
          user_id: currentUser.id,
          user_name: currentUser.full_name || "Someone",
          media_url: mediaUrl,
          media_owner_id: mediaOwnerId,
          type,
        });
      }
    },
    onSuccess: invalidate,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!commentText.trim()) return;
      await base44.entities.MediaReaction.create({
        user_id: currentUser.id,
        user_name: currentUser.full_name || "Someone",
        media_url: mediaUrl,
        media_owner_id: mediaOwnerId,
        type: "like",
        comment: commentText.trim(),
      });
    },
    onSuccess: () => { setCommentText(""); invalidate(); },
  });

  const deleteReaction = useMutation({
    mutationFn: (id) => base44.entities.MediaReaction.delete(id),
    onSuccess: invalidate,
  });

  const quickReactions = reactions.filter(r => !r.comment);
  const comments = reactions.filter(r => !!r.comment);
  const reactionCounts = QUICK_REACTIONS.map(({ type, emoji }) => ({
    type, emoji,
    count: quickReactions.filter(r => r.type === type).length,
    isMine: quickReactions.some(r => r.user_id === currentUser?.id && r.type === type),
  })).filter(r => r.count > 0);

  const myReaction = quickReactions.find(r => r.user_id === currentUser?.id);

  return (
    <div>
      {/* Reaction bar */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {reactionCounts.map(({ type, emoji, count, isMine }) => (
          <button
            key={type}
            onClick={() => addReaction.mutate(type)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all active:scale-95 ${
              isMine
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/60 border-border/60 text-foreground hover:bg-muted"
            }`}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </button>
        ))}

        {/* Add reaction button */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-all ${
            showPanel
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
        >
          <SmilePlus className="h-3.5 w-3.5" />
          {!myReaction && <span className="hidden sm:inline">React</span>}
        </button>

        {comments.length > 0 && !showPanel && (
          <button
            onClick={() => setShowPanel(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {comments.length} comment{comments.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {showPanel && (
        <div className="mt-2.5 bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
          {/* Emoji picker */}
          <div className="flex justify-around px-3 py-2.5 border-b border-border/30">
            {QUICK_REACTIONS.map(({ type, emoji }) => {
              const isMine = quickReactions.some(r => r.user_id === currentUser.id && r.type === type);
              return (
                <button
                  key={type}
                  onClick={() => addReaction.mutate(type)}
                  className={`text-xl p-2 rounded-xl transition-all active:scale-90 ${
                    isMine ? "bg-primary/20 scale-110 shadow-sm" : "hover:bg-muted active:bg-muted"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>

          {/* Comment input */}
          <div className="flex gap-2 items-center px-3 py-2.5">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addComment.mutate()}
              placeholder="Add a comment..."
              maxLength={100}
              className="flex-1 bg-background rounded-lg border border-border/60 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <button
              onClick={() => addComment.mutate()}
              disabled={!commentText.trim()}
              className="h-7 w-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30 transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Comments */}
          {comments.length > 0 && (
            <div className="px-3 pb-3 space-y-2 max-h-40 overflow-y-auto border-t border-border/30 pt-2.5">
              {comments.map(r => (
                <div key={r.id} className="flex items-start justify-between gap-2 group">
                  <p className="text-xs leading-relaxed">
                    <span className="font-semibold text-foreground">{r.user_name}</span>
                    <span className="text-muted-foreground"> {r.comment}</span>
                  </p>
                  {currentUser?.id === r.user_id && (
                    <button
                      onClick={() => deleteReaction.mutate(r.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageCircle, X, Send } from "lucide-react";

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
      // Toggle: remove if same reaction already exists
      const existing = reactions.find(r => r.user_id === currentUser.id && r.type === type && !r.comment);
      if (existing) {
        await base44.entities.MediaReaction.delete(existing.id);
      } else {
        // Remove any previous quick reaction from same user on this media
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
    onSuccess: () => {
      setCommentText("");
      invalidate();
    },
  });

  const deleteReaction = useMutation({
    mutationFn: (id) => base44.entities.MediaReaction.delete(id),
    onSuccess: invalidate,
  });

  // Aggregate quick reactions (non-comment)
  const quickReactions = reactions.filter(r => !r.comment);
  const comments = reactions.filter(r => !!r.comment);

  const reactionCounts = QUICK_REACTIONS.map(({ type, emoji }) => ({
    type, emoji,
    count: quickReactions.filter(r => r.type === type).length,
    isMine: quickReactions.some(r => r.user_id === currentUser?.id && r.type === type),
  }));

  const totalReactions = quickReactions.length + comments.length;

  return (
    <div className="mt-2">
      {/* Summary row */}
      <div className="flex items-center gap-2 flex-wrap">
        {reactionCounts.filter(r => r.count > 0).map(({ type, emoji, count, isMine }) => (
          <button
            key={type}
            onClick={() => currentUser && addReaction.mutate(type)}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-all ${
              isMine
                ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                : "bg-muted/50 border-border text-foreground"
            }`}
          >
            <span>{emoji}</span>
            <span>{count}</span>
          </button>
        ))}
        {comments.length > 0 && (
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border bg-muted/50 border-border text-muted-foreground"
          >
            <MessageCircle className="h-3 w-3" />
            <span>{comments.length}</span>
          </button>
        )}
        {currentUser && (
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            React
          </button>
        )}
      </div>

      {/* Expanded panel */}
      {showPanel && (
        <div className="mt-2 bg-muted/40 rounded-xl border border-border p-3 space-y-3">
          {/* Quick emoji row */}
          {currentUser && (
            <div className="flex gap-2 justify-around">
              {QUICK_REACTIONS.map(({ type, emoji }) => {
                const isMine = quickReactions.some(r => r.user_id === currentUser.id && r.type === type);
                return (
                  <button
                    key={type}
                    onClick={() => addReaction.mutate(type)}
                    className={`text-xl rounded-xl p-1.5 transition-all ${isMine ? "bg-primary/20 scale-110" : "hover:bg-muted"}`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* Comment input */}
          {currentUser && (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addComment.mutate()}
                placeholder="Add a comment..."
                maxLength={100}
                className="flex-1 rounded-lg bg-background border border-border px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={() => addComment.mutate()}
                disabled={!commentText.trim()}
                className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Comments list */}
          {comments.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {comments.map(r => (
                <div key={r.id} className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-foreground">{r.user_name} </span>
                    <span className="text-xs text-muted-foreground">{r.comment}</span>
                  </div>
                  {currentUser?.id === r.user_id && (
                    <button onClick={() => deleteReaction.mutate(r.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setShowPanel(false)} className="text-xs text-muted-foreground hover:text-foreground w-full text-right">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
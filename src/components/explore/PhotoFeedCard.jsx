import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, X, SmilePlus } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_REACTIONS = [
  { type: "love", emoji: "❤️" },
  { type: "fire", emoji: "🔥" },
  { type: "wow", emoji: "😮" },
  { type: "haha", emoji: "😂" },
  { type: "like", emoji: "👍" },
];

export default function PhotoFeedCard({ photo, owner, currentUser, darkMode = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const lastTap = useRef(0);

  const { data: reactions = [] } = useQuery({
    queryKey: ["mediaReactions", photo],
    queryFn: () => base44.entities.MediaReaction.filter({ media_url: photo }),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["mediaReactions", photo] });

  const quickReactions = reactions.filter(r => !r.comment);
  const comments = reactions.filter(r => !!r.comment);
  const totalLikes = quickReactions.length;
  const myReaction = quickReactions.find(r => r.user_id === currentUser?.id);

  const reactionCounts = QUICK_REACTIONS.map(({ type, emoji }) => ({
    type, emoji,
    count: quickReactions.filter(r => r.type === type).length,
    isMine: quickReactions.some(r => r.user_id === currentUser?.id && r.type === type),
  })).filter(r => r.count > 0);

  const addReaction = useMutation({
    mutationFn: async (type) => {
      if (!currentUser) return;
      const existing = quickReactions.find(r => r.user_id === currentUser.id && r.type === type);
      if (existing) {
        await base44.entities.MediaReaction.delete(existing.id);
      } else {
        const prev = quickReactions.find(r => r.user_id === currentUser.id);
        if (prev) await base44.entities.MediaReaction.delete(prev.id);
        await base44.entities.MediaReaction.create({
          user_id: currentUser.id,
          user_name: currentUser.full_name || "Someone",
          media_url: photo,
          media_owner_id: owner.user_id,
          type,
        });
      }
    },
    onSuccess: () => { invalidate(); setShowEmojiPicker(false); },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!commentText.trim() || !currentUser) return;
      await base44.entities.MediaReaction.create({
        user_id: currentUser.id,
        user_name: currentUser.full_name || "Someone",
        media_url: photo,
        media_owner_id: owner.user_id,
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

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (currentUser && !myReaction) {
        addReaction.mutate("love");
        setDoubleTapHeart(true);
        setTimeout(() => setDoubleTapHeart(false), 1000);
      }
    }
    lastTap.current = now;
  };

  const bg = darkMode ? "#111114" : undefined;
  const cardBg = darkMode ? "transparent" : "bg-card";
  const borderColor = darkMode ? "border-white/5" : "border-border/50";
  const textPrimary = darkMode ? "text-gray-100" : "text-foreground";
  const textMuted = darkMode ? "text-gray-500" : "text-muted-foreground";
  const inputBg = darkMode ? "bg-white/5 rounded-xl px-3" : "bg-transparent";
  const reactionBg = darkMode ? "bg-white/10" : "hover:bg-muted";

  return (
    <div className={`${cardBg} border-b ${borderColor}`} style={bg ? { backgroundColor: bg } : {}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          className="flex items-center gap-2.5"
          onClick={() => navigate(`/user/${owner.user_id}`, { state: { from: "/explore", userName: owner.user_name } })}
        >
          <UserAvatar
            name={owner.user_name}
            size="sm"
            colorIndex={owner.user_id?.charCodeAt(0) || 0}
            avatarUrl={owner.avatar_url}
          />
          <div className="text-left">
            <p className={`text-sm font-semibold leading-none ${textPrimary}`}>{owner.user_name || "Unknown"}</p>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              {formatDistanceToNow(new Date(owner.updated_date || Date.now()), { addSuffix: true })}
            </p>
          </div>
        </button>
      </div>

      {/* Photo */}
      <div className="relative" onClick={handleDoubleTap}>
        <img src={photo} alt="" className="w-full object-cover max-h-[480px] min-h-[240px] bg-gray-900" />
        <AnimatePresence>
          {doubleTapHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.4, opacity: 0.9 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="h-24 w-24 fill-rose-500 text-rose-500 drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action bar */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-4">
          {/* Like */}
          <button
            onClick={() => currentUser && (myReaction ? addReaction.mutate(myReaction.type) : addReaction.mutate("love"))}
            className="flex items-center gap-1.5 transition-transform active:scale-90"
          >
            <Heart
              className={`h-6 w-6 transition-colors ${myReaction ? "fill-rose-500 text-rose-500" : darkMode ? "text-gray-400" : "text-foreground"}`}
            />
            {totalLikes > 0 && (
              <span className={`text-sm font-semibold ${myReaction ? "text-rose-400" : textMuted}`}>{totalLikes}</span>
            )}
          </button>

          {/* Emoji picker toggle */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`transition-colors ${showEmojiPicker ? "text-orange-400" : darkMode ? "text-gray-400" : "text-foreground"}`}
          >
            <SmilePlus className="h-6 w-6" />
          </button>

          {/* Comment */}
          <button
            onClick={() => { setShowComments(!showComments); setShowEmojiPicker(false); }}
            className={`flex items-center gap-1.5 transition-colors ${showComments ? "text-orange-400" : darkMode ? "text-gray-400" : "text-foreground"}`}
          >
            <MessageCircle className="h-6 w-6" />
            {comments.length > 0 && (
              <span className={`text-sm font-semibold ${textMuted}`}>{comments.length}</span>
            )}
          </button>
        </div>

        {/* Reaction summary row */}
        {reactionCounts.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {reactionCounts.map(({ type, emoji, count }) => (
              <span
                key={type}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  darkMode ? "bg-white/8 text-gray-300" : "bg-muted text-muted-foreground"
                }`}
                style={darkMode ? { backgroundColor: "rgba(255,255,255,0.07)" } : {}}
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

        {/* Emoji picker row */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              className="flex gap-2 mt-3 overflow-hidden"
            >
              {QUICK_REACTIONS.map(({ type, emoji }) => {
                const isMine = quickReactions.some(r => r.user_id === currentUser?.id && r.type === type);
                return (
                  <button
                    key={type}
                    onClick={() => addReaction.mutate(type)}
                    className={`text-2xl p-2 rounded-2xl transition-all active:scale-90 ${
                      isMine
                        ? "scale-110"
                        : reactionBg
                    }`}
                    style={isMine && darkMode ? { backgroundColor: "rgba(249,115,22,0.2)" } : isMine ? { backgroundColor: "hsl(var(--primary)/0.15)" } : {}}
                  >
                    {emoji}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {comments.length === 0 && (
                  <p className={`text-xs py-1 ${textMuted}`}>No comments yet. Be the first!</p>
                )}
                {comments.map(r => (
                  <div key={r.id} className="flex items-start justify-between gap-2 group">
                    <p className="text-sm leading-snug">
                      <span className={`font-semibold ${textPrimary}`}>{r.user_name} </span>
                      <span className={darkMode ? "text-gray-400" : "text-foreground/80"}>{r.comment}</span>
                    </p>
                    {currentUser?.id === r.user_id && (
                      <button
                        onClick={() => deleteReaction.mutate(r.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 ${textMuted} hover:text-red-400`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {currentUser && (
                <div className={`flex items-center gap-2 mt-3 border-t pt-3 ${darkMode ? "border-white/5" : "border-border/50"}`}>
                  <UserAvatar
                    name={currentUser.full_name}
                    size="sm"
                    colorIndex={currentUser.id?.charCodeAt(0) || 0}
                  />
                  <input
                    type="text"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addComment.mutate()}
                    placeholder="Add a comment..."
                    maxLength={150}
                    className={`flex-1 text-sm focus:outline-none ${inputBg} ${textPrimary} placeholder:${textMuted}`}
                    style={darkMode ? { color: "#e5e5e5" } : {}}
                  />
                  <button
                    onClick={() => addComment.mutate()}
                    disabled={!commentText.trim()}
                    className="text-orange-400 font-semibold text-sm disabled:opacity-30 transition-opacity"
                  >
                    Post
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-3" />
    </div>
  );
}
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import UserAvatar from "@/components/shared/UserAvatar";
import { formatDistanceToNow } from "date-fns";

export default function FriendCard({ friend, index }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:shadow-md transition-shadow duration-300 cursor-pointer"
      onClick={() => navigate(`/user/${friend.id}`, { state: { from: "/friends", userName: friend.name } })}
    >
        <UserAvatar
          name={friend.name}
          size="md"
          colorIndex={friend.id?.charCodeAt(0) || 0}
          avatarUrl={friend.avatarUrl}
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{friend.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Friends since{" "}
            {friend.since
              ? formatDistanceToNow(new Date(friend.since), { addSuffix: false }) + " ago"
              : "recently"}
          </p>
        </div>
    </motion.div>
  );
}
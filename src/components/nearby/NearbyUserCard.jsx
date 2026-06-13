import React from "react";
import { motion } from "framer-motion";
import { MapPin, UserPlus, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/shared/UserAvatar";

export default function NearbyUserCard({ user, distance, onSendRequest, requestStatus }) {
  const formatDistance = (d) => {
    if (d < 1) return `${Math.round(d * 1000)}m away`;
    return `${d.toFixed(1)}km away`;
  };

  const statusButton = () => {
    if (requestStatus === "accepted") {
      return (
        <Button size="sm" variant="outline" disabled className="rounded-full text-emerald-600 border-emerald-200 bg-emerald-50">
          <Check className="h-3.5 w-3.5 mr-1" /> Friends
        </Button>
      );
    }
    if (requestStatus === "pending") {
      return (
        <Button size="sm" variant="outline" disabled className="rounded-full text-amber-600 border-amber-200 bg-amber-50">
          <Clock className="h-3.5 w-3.5 mr-1" /> Pending
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        className="rounded-full bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
        onClick={() => onSendRequest(user)}
      >
        <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
      </Button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:shadow-lg transition-shadow duration-300"
    >
      <UserAvatar
        name={user.user_name}
        size="md"
        colorIndex={user.user_id?.charCodeAt(0) || 0}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">
          {user.user_name || "Anonymous"}
        </h3>
        {user.bio && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{user.bio}</p>
        )}
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary" />
          <span>{formatDistance(distance)}</span>
        </div>
      </div>
      {statusButton()}
    </motion.div>
  );
}
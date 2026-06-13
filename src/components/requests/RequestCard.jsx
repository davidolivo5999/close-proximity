import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/shared/UserAvatar";
import { formatDistanceToNow } from "date-fns";

export default function RequestCard({ request, onAccept, onReject, type = "incoming" }) {
  const name = type === "incoming" ? request.from_user_name : request.to_user_name;
  const userId = type === "incoming" ? request.from_user_id : request.to_user_id;

  return (
    <motion.div
      initial={{ opacity: 0, x: type === "incoming" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: type === "incoming" ? -20 : 20 }}
      className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border"
    >
      <UserAvatar
        name={name}
        size="md"
        colorIndex={userId?.charCodeAt(0) || 0}
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{name || "Unknown"}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {request.created_date
            ? formatDistanceToNow(new Date(request.created_date), { addSuffix: true })
            : "Just now"}
        </p>
      </div>
      {type === "incoming" ? (
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => onReject(request)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-primary shadow-md shadow-primary/20"
            onClick={() => onAccept(request)}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium">
          Pending
        </span>
      )}
    </motion.div>
  );
}
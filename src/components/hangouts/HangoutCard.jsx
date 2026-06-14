import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, CheckCircle2, Trash2, MessageCircle, CalendarPlus, MapPinCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/shared/UserAvatar";
import HangoutChat from "./HangoutChat";
import { base44 } from "@/api/base44Client";

function useCountdown(expiresAt) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [fraction, setFraction] = useState(1);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const end = new Date(expiresAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        setIsExpired(true);
        setFraction(0);
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (h > 0) setTimeLeft(`${h}h ${m}m left`);
      else if (m > 0) setTimeLeft(`${m}m ${s}s left`);
      else setTimeLeft(`${s}s left`);

      // fraction of total duration remaining for progress arc
      // we can't know total easily, so just use < 10min as "urgent"
      setFraction(Math.min(1, diff / 3600000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { timeLeft, isExpired, fraction };
}

export default function HangoutCard({
  hangout,
  distance,
  currentUserId,
  currentUser,
  onRsvp,
  onDelete,
  onCheckIn,
  index = 0,
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const { timeLeft, isExpired } = useCountdown(hangout.expires_at);

  // Live message count via real-time subscription
  useEffect(() => {
    base44.entities.HangoutMessage.filter({ hangout_id: hangout.id }, "created_date", 200)
      .then((msgs) => setMsgCount(msgs.length));
    const unsub = base44.entities.HangoutMessage.subscribe((event) => {
      if (event.data?.hangout_id !== hangout.id) return;
      if (event.type === "create") setMsgCount((c) => c + 1);
      if (event.type === "delete") setMsgCount((c) => Math.max(0, c - 1));
    });
    return unsub;
  }, [hangout.id]);
  const isHost = hangout.host_id === currentUserId;
  const hasRsvped = (hangout.attendee_ids || []).includes(currentUserId);
  const hasCheckedIn = (hangout.checked_in_ids || []).includes(currentUserId);
  const checkedInCount = (hangout.checked_in_ids || []).length;
  const attendeeCount = (hangout.attendee_ids || []).length;

  const addToGoogleCalendar = () => {
    const start = new Date(hangout.expires_at);
    // Use created_date as start if available, otherwise start = expires_at - duration
    const durationMs = (hangout.duration_hours || 1) * 3600 * 1000;
    const startTime = new Date(start.getTime() - durationMs);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const title = encodeURIComponent(`${hangout.emoji || "📍"} ${hangout.title}`);
    const details = encodeURIComponent(hangout.description || "Hangout on VibeCheck");
    const dates = `${fmt(startTime)}/${fmt(start)}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
    window.open(url, "_blank");
  };

  const formatDistance = (d) => {
    if (!d && d !== 0) return null;
    if (d < 1) return `${Math.round(d * 1000)}m`;
    return `${d.toFixed(1)}km`;
  };

  // urgency color
  const urgencyClass = isExpired
    ? "from-muted/60 to-muted/40 border-border/50 opacity-60"
    : "from-card to-card border-border hover:shadow-lg";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`relative rounded-2xl border bg-gradient-to-br p-4 transition-shadow duration-300 ${urgencyClass}`}
    >
      {/* Host row */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <UserAvatar
            name={hangout.host_name}
            size="sm"
            colorIndex={hangout.host_id?.charCodeAt(0) || 0}
          />
          {/* Emoji badge */}
          <span className="absolute -bottom-1 -right-1 text-sm leading-none">
            {hangout.emoji || "📍"}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground leading-tight truncate">
                {hangout.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isHost ? "You" : hangout.host_name}
              </p>
            </div>

            {isHost && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 -mt-0.5"
                onClick={() => onDelete(hangout)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {hangout.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {hangout.description}
            </p>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center flex-wrap gap-2 mt-3">
        <Badge
          variant="secondary"
          className={`text-xs gap-1 ${
            isExpired
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary border-primary/20"
          }`}
        >
          <Clock className="h-3 w-3" />
          {timeLeft}
        </Badge>

        {attendeeCount > 0 && (
          <Badge variant="secondary" className="text-xs gap-1 bg-accent/10 text-accent border-accent/20">
            <Users className="h-3 w-3" />
            {attendeeCount} going
          </Badge>
        )}

        {checkedInCount > 0 && (
          <Badge variant="secondary" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            <MapPinCheck className="h-3 w-3" />
            {checkedInCount} here
          </Badge>
        )}

        {distance != null && (
          <Badge variant="secondary" className="text-xs gap-1">
            <MapPin className="h-3 w-3 text-primary" />
            {formatDistance(distance)}
          </Badge>
        )}
      </div>

      {/* RSVP + Chat toggle row */}
      <div className="mt-3 flex items-center gap-2">
        {!isHost && !isExpired && (
          <div className="flex-1 flex items-center gap-2">
            {hasRsvped ? (
              hasCheckedIn ? (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  <MapPinCheck className="h-4 w-4" /> Checked in!
                </div>
              ) : (
                <Button
                  size="sm"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
                  onClick={() => onCheckIn && onCheckIn(hangout)}
                >
                  <MapPinCheck className="h-3.5 w-3.5" /> Check in
                </Button>
              )
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => { onRsvp(hangout); addToGoogleCalendar(); }}
              >
                Join Hangout
              </Button>
            )}
          </div>
        )}

        {isHost && !isExpired && (
          <div className="flex items-center gap-1.5">
            {hasCheckedIn ? (
              <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <MapPinCheck className="h-4 w-4" /> You're here!
              </div>
            ) : (
              <Button
                size="sm"
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
                onClick={() => onCheckIn && onCheckIn(hangout)}
              >
                <MapPinCheck className="h-3.5 w-3.5" /> Check in
              </Button>
            )}
          </div>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="rounded-xl gap-1.5 text-muted-foreground hover:text-blue-600"
          onClick={addToGoogleCalendar}
          title="Add to Google Calendar"
        >
          <CalendarPlus className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={chatOpen ? "secondary" : "ghost"}
          className="rounded-xl gap-1.5 text-muted-foreground hover:text-foreground ml-auto"
          onClick={() => setChatOpen((v) => !v)}
        >
          <MessageCircle className="h-4 w-4" />
          Chat
          {msgCount > 0 && (
            <span className="ml-0.5 text-[10px] font-semibold bg-primary/20 text-primary rounded-full px-1.5 py-0.5 leading-none">
              {msgCount}
            </span>
          )}
        </Button>
      </div>

      {/* Chat panel */}
      {chatOpen && currentUser && (
        <HangoutChat hangoutId={hangout.id} currentUser={currentUser} />
      )}
    </motion.div>
  );
}
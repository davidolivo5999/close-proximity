import React, { useRef, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, THRESHOLD], [0, 1]);
  const scale = useTransform(y, [0, THRESHOLD], [0.5, 1]);
  const rotation = useTransform(y, [0, THRESHOLD * 2], [0, 360]);

  const handleTouchStart = useCallback((e) => {
    // Only trigger if scrolled to top
    const el = e.currentTarget.querySelector("[data-scroll-container]") || e.currentTarget;
    if (el.scrollTop > 2) return;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) return;
    // resist beyond threshold
    const pull = delta > THRESHOLD ? THRESHOLD + (delta - THRESHOLD) * 0.2 : delta;
    y.set(Math.min(pull, THRESHOLD * 1.5));
  }, [refreshing, y]);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (y.get() >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      animate(y, THRESHOLD * 0.6, { duration: 0.15 });
      await onRefresh();
      setRefreshing(false);
    }
    animate(y, 0, { duration: 0.3, ease: "easeOut" });
  }, [y, refreshing, onRefresh]);

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-20"
        style={{ y: useTransform(y, (v) => v * 0.6 - 40), opacity }}
      >
        <motion.div
          className="w-9 h-9 rounded-full bg-card border border-border shadow-md flex items-center justify-center"
          style={{ scale }}
        >
          <motion.div style={{ rotate: refreshing ? undefined : rotation }}>
            <RefreshCw
              className={`h-4 w-4 text-primary ${refreshing ? "animate-spin" : ""}`}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content pushed down while pulling */}
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}
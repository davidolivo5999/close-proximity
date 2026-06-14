import React from "react";
import { Crown } from "lucide-react";

export default function ProBadge({ size = "sm" }) {
  const cls = size === "xs"
    ? "text-[9px] px-1.5 py-0.5 gap-0.5"
    : "text-[10px] px-2 py-0.5 gap-1";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white ${cls}`}
    >
      <Crown className={size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      PRO
    </span>
  );
}
import React from "react";

const COLORS = [
  "bg-gradient-to-br from-orange-400 to-rose-500",
  "bg-gradient-to-br from-violet-400 to-purple-600",
  "bg-gradient-to-br from-emerald-400 to-teal-600",
  "bg-gradient-to-br from-sky-400 to-blue-600",
  "bg-gradient-to-br from-amber-400 to-orange-500",
  "bg-gradient-to-br from-pink-400 to-fuchsia-600",
];

export default function UserAvatar({ name, size = "md", colorIndex = 0 }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-base",
    lg: "h-16 w-16 text-xl",
    xl: "h-24 w-24 text-3xl",
  };

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const color = COLORS[Math.abs(colorIndex) % COLORS.length];

  return (
    <div
      className={`${sizes[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold shadow-lg ring-2 ring-white/20`}
    >
      {initials}
    </div>
  );
}
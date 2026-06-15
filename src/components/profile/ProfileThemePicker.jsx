import React from "react";
import { Check } from "lucide-react";

export const PROFILE_THEMES = [
  { id: "default", label: "Default", gradient: "from-primary/20 to-accent/20" },
  { id: "sunset", label: "Sunset", gradient: "from-orange-400 to-rose-500" },
  { id: "ocean", label: "Ocean", gradient: "from-sky-400 to-blue-600" },
  { id: "forest", label: "Forest", gradient: "from-emerald-400 to-teal-600" },
  { id: "candy", label: "Candy", gradient: "from-pink-400 to-fuchsia-500" },
  { id: "gold", label: "Gold", gradient: "from-amber-400 to-yellow-500" },
  { id: "midnight", label: "Midnight", gradient: "from-violet-500 to-indigo-700" },
];

export default function ProfileThemePicker({ value, onChange }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-3">Profile Theme</p>
      <div className="grid grid-cols-4 gap-2">
        {PROFILE_THEMES.map((theme) => {
          const selected = value === theme.id || (!value && theme.id === "default");
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChange(theme.id)}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl p-1.5 border-2 transition-all ${
                selected ? "border-primary shadow-sm" : "border-transparent hover:border-primary/40"
              }`}
            >
              <div className={`w-full aspect-square rounded-lg bg-gradient-to-br ${theme.gradient}`} />
              <span className="text-[10px] text-muted-foreground font-medium">{theme.label}</span>
              {selected && (
                <div className="absolute top-2 right-2 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
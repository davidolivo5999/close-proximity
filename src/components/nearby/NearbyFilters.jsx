import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MapPin } from "lucide-react";

export const INTEREST_TAGS = [
  "🎮 Gaming", "🎵 Music", "📸 Photography", "🏃 Fitness",
  "🍕 Food", "✈️ Travel", "📚 Books", "🎨 Art",
  "💻 Tech", "🧘 Wellness", "🎬 Movies", "🌿 Nature",
];

export default function NearbyFilters({ sortBy, setSortBy, activeInterest, setActiveInterest, matchCount }) {
  return (
    <div className="space-y-3 mb-4">
      {/* Sort + match count row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={sortBy === "distance" ? "default" : "outline"}
              className="rounded-full h-7 text-xs px-3"
              onClick={() => setSortBy("distance")}
            >
              <MapPin className="h-3 w-3 mr-1" /> Nearest
            </Button>
            <Button
              size="sm"
              variant={sortBy === "name" ? "default" : "outline"}
              className="rounded-full h-7 text-xs px-3"
              onClick={() => setSortBy("name")}
            >
              A–Z
            </Button>
          </div>
        </div>
        {activeInterest && matchCount !== undefined && (
          <span className="text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1">
            {matchCount} {matchCount === 1 ? "person" : "people"}
          </span>
        )}
      </div>

      {/* Interest filter chips — horizontal scroll */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-5 px-5">
        <Button
          size="sm"
          variant={activeInterest === null ? "secondary" : "outline"}
          className="rounded-full h-7 text-xs px-3 flex-shrink-0"
          onClick={() => setActiveInterest(null)}
        >
          All
        </Button>
        {INTEREST_TAGS.map((tag) => (
          <Button
            key={tag}
            size="sm"
            variant={activeInterest === tag ? "default" : "outline"}
            className="rounded-full h-7 text-xs px-3 flex-shrink-0"
            onClick={() => setActiveInterest(activeInterest === tag ? null : tag)}
          >
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}
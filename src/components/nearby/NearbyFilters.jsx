import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MapPin } from "lucide-react";

export const INTEREST_TAGS = [
  "🎮 Gaming", "🎵 Music", "📸 Photography", "🏃 Fitness",
  "🍕 Food", "✈️ Travel", "📚 Books", "🎨 Art",
  "💻 Tech", "🧘 Wellness", "🎬 Movies", "🌿 Nature",
];

export default function NearbyFilters({ sortBy, setSortBy, activeInterest, setActiveInterest }) {
  return (
    <div className="space-y-3 mb-4">
      {/* Sort buttons */}
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

      {/* Interest filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        <Button
          size="sm"
          variant={activeInterest === null ? "secondary" : "outline"}
          className="rounded-full h-7 text-xs px-3"
          onClick={() => setActiveInterest(null)}
        >
          All
        </Button>
        {INTEREST_TAGS.map((tag) => (
          <Button
            key={tag}
            size="sm"
            variant={activeInterest === tag ? "default" : "outline"}
            className="rounded-full h-7 text-xs px-3"
            onClick={() => setActiveInterest(activeInterest === tag ? null : tag)}
          >
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}
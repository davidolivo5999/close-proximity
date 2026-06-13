import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import UserAvatar from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";

export default function Search() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const { data: allLocations = [], isLoading } = useQuery({
    queryKey: ["allVisibleUsers"],
    queryFn: () => base44.entities.UserLocation.filter({ is_visible: true }),
  });

  const results = query.trim().length >= 2
    ? allLocations.filter((u) =>
        (u.user_name || "").toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="px-5 pt-14">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-foreground">Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Find people by name</p>
      </div>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className="pl-9 rounded-2xl bg-muted/50 border-0 focus-visible:ring-primary/30"
        />
      </div>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="text-sm text-muted-foreground text-center py-8">Type at least 2 characters...</p>
      )}

      {query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">No one found matching "{query}"</p>
      )}

      <div className="space-y-3">
        {results.map((u) => (
          <button
            key={u.user_id}
            className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:shadow-lg transition-shadow duration-300 text-left"
            onClick={() => navigate(`/user/${u.user_id}`, { state: { from: "/search", userName: u.user_name } })}
          >
            <UserAvatar
              name={u.user_name}
              size="md"
              colorIndex={u.user_id?.charCodeAt(0) || 0}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{u.user_name}</h3>
              {u.bio && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">{u.bio}</p>
              )}
              {u.interests?.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {u.interests.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs rounded-full py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}
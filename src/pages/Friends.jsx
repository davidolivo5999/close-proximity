import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import FriendCard from "@/components/friends/FriendCard";


export default function Friends() {
  const [search, setSearch] = React.useState("");

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: acceptedRequests = [], isLoading } = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      const [sent, received] = await Promise.all([
        base44.entities.FriendRequest.filter({
          from_user_id: user.id,
          status: "accepted",
        }),
        base44.entities.FriendRequest.filter({
          to_user_id: user.id,
          status: "accepted",
        }),
      ]);
      return [...sent, ...received];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const friends = acceptedRequests.map((r) => {
    const isSender = r.from_user_id === user?.id;
    return {
      id: isSender ? r.to_user_id : r.from_user_id,
      name: isSender ? r.to_user_name : r.from_user_name,
      since: r.updated_date,
    };
  });

  const friendIds = friends.map((f) => f.id);
  const { data: allLocations = [] } = useQuery({
    queryKey: ["allUserLocations", friendIds.join(",")],
    queryFn: () => base44.entities.UserLocation.filter({ user_id: { $in: friendIds } }),
    enabled: friendIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const avatarMap = useMemo(() => {
    const map = {};
    for (const loc of allLocations) {
      if (friendIds.includes(loc.user_id) && loc.avatar_url) map[loc.user_id] = loc.avatar_url;
    }
    return map;
  }, [allLocations, friendIds]);

  const filtered = friends.filter((f) =>
    f.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3 safe-area-top">
        <h1 className="text-2xl font-heading font-bold text-foreground">Friends</h1>
        <p className="text-sm text-muted-foreground">
          {friends.length} {friends.length === 1 ? "connection" : "connections"}
        </p>
      </div>

      <div className="px-5 pt-4">
        {friends.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl bg-muted/50 border-0 focus-visible:ring-primary/30"
            />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No friends yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Go to the Discover tab and add people nearby to start building your circle.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((friend, i) => (
              <FriendCard key={friend.id} friend={{ ...friend, avatarUrl: avatarMap[friend.id] }} index={i} />
            ))}
            {filtered.length === 0 && search && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No friends matching "{search}"
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
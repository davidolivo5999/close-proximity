import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import UserAvatar from "@/components/shared/UserAvatar";
import { Users } from "lucide-react";

function getFriendIds(requests, userId) {
  const ids = new Set();
  for (const r of requests) {
    if (r.status !== "accepted") continue;
    if (r.from_user_id === userId) ids.add(r.to_user_id);
    else if (r.to_user_id === userId) ids.add(r.from_user_id);
  }
  return ids;
}

export default function MutualFriends({ currentUserId, profileUserId }) {
  const navigate = useNavigate();

  // Fetch current user's friends
  const { data: myRequests = [] } = useQuery({
    queryKey: ["friendRequests", currentUserId],
    queryFn: async () => {
      const [sent, recv] = await Promise.all([
        base44.entities.FriendRequest.filter({ from_user_id: currentUserId, status: "accepted" }),
        base44.entities.FriendRequest.filter({ to_user_id: currentUserId, status: "accepted" }),
      ]);
      return [...sent, ...recv];
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch profile user's friends (public read)
  const { data: theirRequests = [] } = useQuery({
    queryKey: ["friendRequestsOf", profileUserId],
    queryFn: async () => {
      const [sent, recv] = await Promise.all([
        base44.entities.FriendRequest.filter({ from_user_id: profileUserId, status: "accepted" }),
        base44.entities.FriendRequest.filter({ to_user_id: profileUserId, status: "accepted" }),
      ]);
      return [...sent, ...recv];
    },
    enabled: !!profileUserId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const myFriendIds = getFriendIds(myRequests, currentUserId);
  const theirFriendIds = getFriendIds(theirRequests, profileUserId);
  const mutualIds = [...myFriendIds].filter((id) => theirFriendIds.has(id));

  // Fetch location data for mutual friend names/avatars
  const { data: mutualProfiles = [] } = useQuery({
    queryKey: ["mutualProfiles", mutualIds.join(",")],
    queryFn: async () => {
      const profiles = await Promise.all(
        mutualIds.map((id) =>
          base44.entities.UserLocation.filter({ user_id: id }).then((r) => r[0] || null)
        )
      );
      return profiles.filter(Boolean);
    },
    enabled: mutualIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!currentUserId || mutualIds.length === 0) return null;

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: "#1a1a22", border: "1px solid #2a2a35" }}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-3.5 w-3.5 text-gray-500" />
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {mutualIds.length} Mutual Friend{mutualIds.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {mutualProfiles.slice(0, 5).map((profile) => (
          <button
            key={profile.user_id}
            onClick={() => navigate(`/user/${profile.user_id}`)}
            className="flex items-center gap-3 group"
          >
            <UserAvatar
              name={profile.user_name}
              size="sm"
              colorIndex={profile.user_id?.charCodeAt(0) || 0}
              avatarUrl={profile.avatar_url}
            />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">
              {profile.user_name || "VibeCheck User"}
            </span>
          </button>
        ))}
        {mutualIds.length > 5 && (
          <p className="text-xs text-gray-500 pl-11">+{mutualIds.length - 5} more</p>
        )}
      </div>
    </div>
  );
}
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { toast } from "sonner";

export default function BlockedUsers({ userId }) {
  const queryClient = useQueryClient();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["myBlocks", userId],
    queryFn: () => base44.entities.Block.filter({ blocker_id: userId }),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  const { data: blockedProfiles = [] } = useQuery({
    queryKey: ["blockedProfiles", blocks.map(b => b.blocked_id).join(",")],
    queryFn: async () => {
      const profiles = await Promise.all(
        blocks.map(b =>
          base44.entities.UserLocation.filter({ user_id: b.blocked_id })
            .then(res => ({ blockId: b.id, userId: b.blocked_id, profile: res[0] || null }))
        )
      );
      return profiles;
    },
    enabled: blocks.length > 0,
    staleTime: 60 * 1000,
  });

  const unblock = useMutation({
    mutationFn: (blockId) => base44.entities.Block.delete(blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myBlocks", userId] });
      queryClient.invalidateQueries({ queryKey: ["blocks"] });
      toast.success("User unblocked.");
    },
  });

  if (isLoading) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="h-4 w-4 text-destructive/70" />
        </div>
        <p className="text-sm font-semibold text-foreground">Blocked Users</p>
      </div>

      {blocks.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven't blocked anyone.</p>
      ) : (
        <div className="space-y-3">
          {blockedProfiles.map(({ blockId, userId: blockedId, profile }) => {
            const name = profile?.user_name || "VibeCheck User";
            return (
              <div key={blockId} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={name}
                    size="sm"
                    colorIndex={blockedId?.charCodeAt(0) || 0}
                    avatarUrl={profile?.avatar_url}
                  />
                  <span className="text-sm text-foreground">{name}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs rounded-lg"
                  onClick={() => unblock.mutate(blockId)}
                  disabled={unblock.isPending}
                >
                  Unblock
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
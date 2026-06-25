import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/shared/UserAvatar";
import { X, Check, Users } from "lucide-react";

export default function NewGroupChatDialog({ currentUser, onClose, onCreate }) {
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [creating, setCreating] = useState(false);

  // Fetch mutual friends (accepted friend requests on both sides)
  const { data: sentRequests = [] } = useQuery({
    queryKey: ["friendRequests-sent", currentUser?.id],
    queryFn: () => base44.entities.FriendRequest.filter({ from_user_id: currentUser.id, status: "accepted" }),
    enabled: !!currentUser?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: receivedRequests = [] } = useQuery({
    queryKey: ["friendRequests-received", currentUser?.id],
    queryFn: () => base44.entities.FriendRequest.filter({ to_user_id: currentUser.id, status: "accepted" }),
    enabled: !!currentUser?.id,
    staleTime: 2 * 60 * 1000,
  });

  const friends = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const r of sentRequests) {
      if (!seen.has(r.to_user_id)) {
        seen.add(r.to_user_id);
        list.push({ id: r.to_user_id, name: r.to_user_name });
      }
    }
    for (const r of receivedRequests) {
      if (!seen.has(r.from_user_id)) {
        seen.add(r.from_user_id);
        list.push({ id: r.from_user_id, name: r.from_user_name });
      }
    }
    return list;
  }, [sentRequests, receivedRequests]);

  const toggle = (id) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.length === 0) return;
    setCreating(true);
    const memberIds = [currentUser.id, ...selectedIds];
    const memberNames = [
      currentUser.full_name,
      ...selectedIds.map((id) => friends.find((f) => f.id === id)?.name || ""),
    ];
    const group = await base44.entities.GroupChat.create({
      name: groupName.trim(),
      created_by_id: currentUser.id,
      member_ids: memberIds,
      member_names: memberNames,
      last_message_at: new Date().toISOString(),
    });
    setCreating(false);
    onCreate(group);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-background w-full max-w-lg rounded-t-3xl p-5 pb-8 safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">New Group Chat</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Group name */}
        <input
          className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary mb-4"
          placeholder="Group name (e.g. Friday crew)"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {/* Friend list */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Add friends ({selectedIds.length} selected)
        </p>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No friends yet — connect with people first!
          </p>
        ) : (
          <div className="space-y-1 max-h-52 overflow-y-auto mb-4">
            {friends.map((f, i) => {
              const selected = selectedIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${selected ? "bg-primary/10" : "hover:bg-muted"}`}
                >
                  <UserAvatar name={f.name} size="sm" colorIndex={i} />
                  <span className="flex-1 text-sm font-medium text-foreground text-left">{f.name}</span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        <Button
          className="w-full rounded-2xl h-11 font-semibold"
          onClick={handleCreate}
          disabled={!groupName.trim() || selectedIds.length === 0 || creating}
          style={{ background: "linear-gradient(135deg, #f97316, #ec4899)" }}
        >
          {creating ? "Creating…" : `Create Group (${selectedIds.length + 1} people)`}
        </Button>
      </div>
    </div>
  );
}
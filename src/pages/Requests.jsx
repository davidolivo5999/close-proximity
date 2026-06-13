import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Inbox, Send, Bell } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import RequestCard from "@/components/requests/RequestCard";

export default function Requests() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: incoming = [], isLoading: loadingIn } = useQuery({
    queryKey: ["incomingRequests", user?.id],
    queryFn: () =>
      base44.entities.FriendRequest.filter({
        to_user_id: user.id,
        status: "pending",
      }),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const { data: outgoing = [], isLoading: loadingOut } = useQuery({
    queryKey: ["outgoingRequests", user?.id],
    queryFn: () =>
      base44.entities.FriendRequest.filter({
        from_user_id: user.id,
        status: "pending",
      }),
    enabled: !!user?.id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["incomingRequests"] });
    queryClient.invalidateQueries({ queryKey: ["outgoingRequests"] });
    queryClient.invalidateQueries({ queryKey: ["friends"] });
    queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
    queryClient.invalidateQueries({ queryKey: ["myRequests"] });
  };

  const acceptMutation = useMutation({
    mutationFn: (req) =>
      base44.entities.FriendRequest.update(req.id, { status: "accepted" }),
    onSuccess: () => {
      toast.success("Friend added!");
      invalidateAll();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (req) =>
      base44.entities.FriendRequest.update(req.id, { status: "rejected" }),
    onSuccess: () => {
      toast("Request declined");
      invalidateAll();
    },
  });

  const EmptyState = ({ icon: Icon, title, desc }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
    </div>
  );

  return (
    <div>
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border/50 px-5 py-3">
        <h1 className="text-2xl font-heading font-bold text-foreground">Requests</h1>
        <p className="text-sm text-muted-foreground">Manage your friend requests</p>
      </div>

      <div className="px-5 pt-4">
        <Tabs defaultValue="incoming">
          <TabsList className="w-full bg-muted/50 rounded-xl p-1 mb-4">
            <TabsTrigger value="incoming" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Inbox className="h-4 w-4 mr-1.5" /> Received
              {incoming.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                  {incoming.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Send className="h-4 w-4 mr-1.5" /> Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-3 mt-0">
            {loadingIn ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : incoming.length === 0 ? (
              <EmptyState icon={Inbox} title="No pending requests" desc="When someone nearby adds you, their request will appear here." />
            ) : (
              <AnimatePresence>
                {incoming.map((r) => (
                  <RequestCard
                    key={r.id}
                    request={r}
                    type="incoming"
                    onAccept={() => acceptMutation.mutate(r)}
                    onReject={() => rejectMutation.mutate(r)}
                  />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3 mt-0">
            {loadingOut ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : outgoing.length === 0 ? (
              <EmptyState icon={Send} title="No sent requests" desc="Requests you send to nearby people will appear here." />
            ) : (
              <AnimatePresence>
                {outgoing.map((r) => (
                  <RequestCard key={r.id} request={r} type="outgoing" />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
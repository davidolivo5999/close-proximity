import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useProStatus() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isPro = user?.pro_status === "active";
  const isPending = user?.pro_status === "pending";

  return { isPro, isPending, proStatus: user?.pro_status || "none", isLoading, user };
}
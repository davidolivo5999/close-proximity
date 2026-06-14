import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useProStatus } from "@/hooks/useProStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap, Star, TrendingUp, Search, Eye, MessageCircle, CheckCircle2,
  Loader2, Crown, X
} from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
  {
    icon: Star,
    title: "Priority placement",
    desc: "Appear higher in nearby results so more people discover you first.",
  },
  {
    icon: Crown,
    title: "Pro profile badge",
    desc: "Stand out with a verified Pro badge on your profile.",
  },
  {
    icon: TrendingUp,
    title: "Connection analytics",
    desc: "See who viewed your profile and track acceptance rate trends.",
  },
  {
    icon: Search,
    title: "Advanced search filters",
    desc: "Filter by school, employer, and city to find the right people.",
  },
  {
    icon: MessageCircle,
    title: "Extended connection notes",
    desc: "Write unlimited notes when connecting (free limit is 160 chars).",
  },
  {
    icon: Eye,
    title: "Read receipts",
    desc: "Know when your messages have been seen (ships in v1.1).",
  },
];

export default function Pro() {
  const { isPro, isPending, proStatus } = useProStatus();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(null); // 'monthly' | 'annual'
  const [polling, setPolling] = useState(false);

  // Detect redirect back from checkout with ?status=confirming
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "confirming") {
      setPolling(true);
      // Poll every 3s for up to 30s
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        const user = await base44.auth.me();
        if (user?.pro_status === "active") {
          clearInterval(interval);
          setPolling(false);
          window.history.replaceState({}, "", "/pro");
          toast.success("You're now a Pro member! 🎉");
        } else if (attempts >= 10) {
          clearInterval(interval);
          setPolling(false);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleUpgrade = async (plan) => {
    setLoading(plan);
    const response = await base44.functions.invoke("createCheckout", { plan });
    const { redirectUrl, error } = response.data;
    if (error || !redirectUrl) {
      toast.error(error || "Something went wrong. Please try again.");
      setLoading(null);
      return;
    }
    window.location.href = redirectUrl;
  };

  return (
    <div className="px-5 pt-6 pb-10 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-lg shadow-orange-500/30">
          <Crown className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground">VibeCheck Pro</h1>
        <p className="text-muted-foreground mt-2">
          Meet more people. Make better connections.
        </p>
      </div>

      {/* Active Pro state */}
      {isPro && (
        <div className="flex flex-col items-center py-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl mb-6">
          <CheckCircle2 className="h-10 w-10 text-amber-500 mb-3" />
          <h2 className="text-xl font-bold text-foreground">You're Pro! 🎉</h2>
          <p className="text-sm text-muted-foreground mt-1">All Pro features are active on your account.</p>
          <Badge className="mt-3 bg-amber-500 text-white border-0">Pro Member</Badge>
        </div>
      )}

      {/* Confirming payment */}
      {polling && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 mb-6">
          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
          <p className="text-sm text-primary font-medium">Confirming your payment…</p>
        </div>
      )}

      {/* Pending */}
      {isPending && !polling && (
        <div className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3 mb-6">
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
          <p className="text-sm text-muted-foreground">Payment is being confirmed…</p>
        </div>
      )}

      {/* Features list */}
      <div className="space-y-3 mb-8">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
            <div className="mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing cards */}
      {!isPro && (
        <div className="space-y-3">
          {/* Annual — highlighted */}
          <div className="relative border-2 border-primary rounded-2xl p-5 bg-card">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                BEST VALUE — SAVE 37%
              </span>
            </div>
            <div className="flex items-end justify-between mb-1">
              <div>
                <p className="text-xl font-bold text-foreground">$44.99 / year</p>
                <p className="text-xs text-muted-foreground">~$3.75/month, billed annually</p>
              </div>
              <Badge variant="outline" className="text-xs">Annual</Badge>
            </div>
            <Button
              className="w-full mt-3 rounded-xl"
              onClick={() => handleUpgrade("annual")}
              disabled={!!loading}
            >
              {loading === "annual" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {loading === "annual" ? "Opening checkout…" : "Go Pro – Annual"}
            </Button>
          </div>

          {/* Monthly */}
          <div className="border border-border rounded-2xl p-5 bg-card">
            <div className="flex items-end justify-between mb-1">
              <div>
                <p className="text-xl font-bold text-foreground">$5.99 / month</p>
                <p className="text-xs text-muted-foreground">Billed monthly, cancel anytime</p>
              </div>
              <Badge variant="outline" className="text-xs">Monthly</Badge>
            </div>
            <Button
              variant="outline"
              className="w-full mt-3 rounded-xl"
              onClick={() => handleUpgrade("monthly")}
              disabled={!!loading}
            >
              {loading === "monthly" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {loading === "monthly" ? "Opening checkout…" : "Go Pro – Monthly"}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Secure checkout by Base44 Payments. Cancel anytime.
          </p>
        </div>
      )}
    </div>
  );
}
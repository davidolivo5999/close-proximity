import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";

export default function Support() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-background flex flex-col">
      <div className="px-5 pt-safe pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24 text-center gap-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Mail className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">Need Help?</h1>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Have a question or need help with Close Proximity? Reach out and we'll get back to you.
          </p>
        </div>

        <a
          href="mailto:support@close-proximity.com"
          className="text-primary font-medium text-sm hover:underline"
        >
          support@close-proximity.com
        </a>
      </div>
    </div>
  );
}
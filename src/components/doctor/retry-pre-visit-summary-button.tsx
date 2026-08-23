"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryPreVisitSummaryAction } from "@/app/actions/doctor";

interface RetryPreVisitSummaryButtonProps {
  appointmentId: string;
}

export function RetryPreVisitSummaryButton({ appointmentId }: RetryPreVisitSummaryButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await retryPreVisitSummaryAction(appointmentId);
      if (res.success) {
        toast.success(res.message || "AI Pre-Visit Summary generated!");
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to generate AI summary.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={isLoading}
      className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      <span>{isLoading ? "Generating..." : "⚡ Generate AI Summary Now"}</span>
    </Button>
  );
}

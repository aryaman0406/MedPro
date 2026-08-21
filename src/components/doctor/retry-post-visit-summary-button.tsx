"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { retryPostVisitSummaryAction } from "@/app/actions/doctor";

export function RetryPostVisitSummaryButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const res = await retryPostVisitSummaryAction(appointmentId);
      if (!res.success) {
        toast.error(res.error || "Retry failed. Check your Gemini API connection.");
      } else {
        toast.success("Post-visit patient brief generated successfully!");
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRetry}
      disabled={isRetrying}
      className="text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
    >
      {isRetrying ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Synthesizing AI Summary...
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5" />
          Retry AI Summary
        </>
      )}
    </Button>
  );
}

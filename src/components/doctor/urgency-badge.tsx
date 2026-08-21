import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UrgencyBadgeProps {
  urgency?: "Low" | "Medium" | "High" | null;
  status?: string | null;
  className?: string;
  showIcon?: boolean;
}

export function UrgencyBadge({ urgency, status, className, showIcon = true }: UrgencyBadgeProps) {
  if (status === "PENDING") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 font-medium flex items-center gap-1 text-xs py-0.5",
          className
        )}
      >
        {showIcon && <Sparkles className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />}
        AI Generating...
      </Badge>
    );
  }

  if (status === "FAILED" || !urgency) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-muted/80 text-muted-foreground border-border font-medium flex items-center gap-1 text-xs py-0.5",
          className
        )}
      >
        {showIcon && <Clock className="h-3 w-3 opacity-60" />}
        Summary unavailable
      </Badge>
    );
  }

  switch (urgency) {
    case "High":
      return (
        <Badge
          variant="destructive"
          className={cn(
            "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/40 font-semibold flex items-center gap-1 text-xs py-0.5 shadow-sm",
            className
          )}
        >
          {showIcon && <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />}
          High Urgency
        </Badge>
      );
    case "Medium":
      return (
        <Badge
          variant="outline"
          className={cn(
            "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40 font-semibold flex items-center gap-1 text-xs py-0.5",
            className
          )}
        >
          {showIcon && <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
          Medium Urgency
        </Badge>
      );
    case "Low":
    default:
      return (
        <Badge
          variant="secondary"
          className={cn(
            "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium flex items-center gap-1 text-xs py-0.5",
            className
          )}
        >
          {showIcon && <CheckCircle2 className="h-3 w-3 text-slate-500 shrink-0" />}
          Low Urgency
        </Badge>
      );
  }
}

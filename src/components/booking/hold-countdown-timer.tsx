"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Timer, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HoldCountdownTimerProps {
  remainingSeconds: number;
  totalSeconds?: number;
  className?: string;
}

export function HoldCountdownTimer({
  remainingSeconds,
  totalSeconds = 300,
  className,
}: HoldCountdownTimerProps) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remainingSeconds / totalSeconds));
  const strokeDashoffset = circumference * (1 - progress);

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;

  const isUrgent = remainingSeconds <= 60;
  const isWarning = remainingSeconds <= 120 && remainingSeconds > 60;

  const strokeColor = isUrgent
    ? "#f43f5e" // rose-500
    : isWarning
    ? "#f59e0b" // amber-500
    : "#10b981"; // emerald-500

  const badgeBg = isUrgent
    ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
    : isWarning
    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

  return (
    <div className={`inline-flex items-center gap-2.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-2xs ${badgeBg} ${className}`}>
      {/* Circular SVG Progress Ring */}
      <div className="relative flex h-7 w-7 items-center justify-center">
        <svg className="h-7 w-7 -rotate-90 transform" viewBox="0 0 40 40">
          {/* Background circle */}
          <circle
            cx="20"
            cy="20"
            r={radius}
            className="stroke-muted/40"
            strokeWidth="3.5"
            fill="none"
          />
          {/* Animated Progress circle */}
          <motion.circle
            cx="20"
            cy="20"
            r={radius}
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.8, ease: "linear" }}
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        {isUrgent ? (
          <span className="absolute flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
          </span>
        ) : (
          <Timer className="absolute h-3.5 w-3.5 opacity-80" />
        )}
      </div>

      <div className="flex items-baseline gap-1.5 font-mono">
        <span className="text-[11px] font-sans font-normal opacity-90">Slot held:</span>
        <span className={`font-bold ${isUrgent ? "animate-pulse font-extrabold text-rose-600 dark:text-rose-400" : ""}`}>
          {formatted}
        </span>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintCarePlanButtonProps {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function PrintCarePlanButton({
  variant = "outline",
  size = "sm",
  className,
}: PrintCarePlanButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handlePrint}
      className={`gap-1.5 font-semibold text-xs print:hidden ${className || ""}`}
    >
      <Printer className="h-3.5 w-3.5" />
      <span>Print / Export PDF</span>
    </Button>
  );
}

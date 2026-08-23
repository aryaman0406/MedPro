"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintCarePlanButtonProps {
  appointmentId?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function PrintCarePlanButton({
  appointmentId,
  variant = "outline",
  size = "sm",
  className,
}: PrintCarePlanButtonProps) {
  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (appointmentId) {
      const targetCard = document.getElementById(`appt-card-${appointmentId}`);
      if (targetCard) {
        document.body.classList.add("printing-single-appointment");
        targetCard.classList.add("target-print-appointment");

        const cleanup = () => {
          document.body.classList.remove("printing-single-appointment");
          targetCard.classList.remove("target-print-appointment");
          window.removeEventListener("afterprint", cleanup);
        };

        window.addEventListener("afterprint", cleanup);
        window.print();
        setTimeout(cleanup, 1000);
        return;
      }
    }

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
      <span>Print Care Plan PDF</span>
    </Button>
  );
}

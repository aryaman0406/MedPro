"use client";

import * as React from "react";
import { Stethoscope, UserCheck, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DoctorUtilizationStat } from "@/app/actions/admin";

interface DoctorUtilizationCardProps {
  data: DoctorUtilizationStat[];
  isLoading?: boolean;
}

export function DoctorUtilizationCard({ data, isLoading }: DoctorUtilizationCardProps) {
  const hasData = data && data.length > 0;

  const getStatusConfig = (rate: number) => {
    if (rate >= 75) {
      return {
        label: "High Demand",
        badgeClass: "bg-emerald-600 text-white",
        barClass: "bg-emerald-500",
      };
    }
    if (rate >= 40) {
      return {
        label: "Optimal",
        badgeClass: "bg-blue-600 text-white",
        barClass: "bg-blue-500",
      };
    }
    return {
      label: "Available Capacity",
      badgeClass: "bg-muted text-muted-foreground",
      barClass: "bg-primary/40",
    };
  };

  return (
    <Card className="shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Doctor Weekly Capacity &amp; Utilization
            </CardTitle>
            <CardDescription className="text-xs">
              Active consultations vs scheduled working hours capacity this week
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            THIS WEEK
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-1 flex-1">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center text-center p-6 border rounded-xl border-dashed bg-muted/10 text-muted-foreground text-xs space-y-2 h-48">
            <UserCheck className="h-7 w-7 text-muted-foreground/50 mb-1" />
            <p className="font-semibold text-foreground">No Active Specialists Found</p>
            <p className="text-[11px] text-muted-foreground">
              Specialist capacity metrics will calculate once doctor profiles and working hours are active.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((doc) => {
              const status = getStatusConfig(doc.utilizationRate);
              return (
                <div
                  key={doc.doctorId}
                  className="rounded-xl border bg-muted/20 p-3.5 space-y-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">{doc.doctorName}</span>
                        <Badge className={`text-[10px] py-0 px-1.5 ${status.badgeClass}`}>
                          {status.label}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-primary font-medium">
                        {doc.specialization}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-extrabold text-foreground text-sm block">
                        {doc.utilizationRate}%
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {doc.bookedSlots} / {doc.availableSlots} slots
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Utilization Bar */}
                  <div className="w-full bg-muted/80 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${status.barClass}`}
                      style={{ width: `${Math.max(4, doc.utilizationRate)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

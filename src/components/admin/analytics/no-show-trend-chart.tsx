"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { UserX, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyNoShowStat } from "@/app/actions/admin";

interface NoShowTrendChartProps {
  overallRate: number;
  data: WeeklyNoShowStat[];
  isLoading?: boolean;
}

export function NoShowTrendChart({
  overallRate,
  data,
  isLoading,
}: NoShowTrendChartProps) {
  const hasData = data && data.some((d) => d.totalFinished > 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: WeeklyNoShowStat = payload[0].payload;
      return (
        <div className="rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur-xs text-xs space-y-1.5 min-w-[170px]">
          <div className="font-bold text-foreground border-b pb-1">
            Week of {item.weekLabel}
          </div>
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold">
              <span>No-Show Rate:</span>
              <span className="font-mono">{item.noShowRate}%</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>No-Show Patients:</span>
              <span className="font-mono font-semibold text-foreground">{item.noShowCount}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Completed Visits:</span>
              <span className="font-mono font-semibold text-foreground">{item.completedCount}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground border-t pt-1">
              <span>Total Concluded:</span>
              <span className="font-mono font-semibold text-foreground">{item.totalFinished}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserX className="h-4 w-4 text-rose-500" />
              Patient No-Show Rate Trend
            </CardTitle>
            <CardDescription className="text-xs">
              Ratio of unfulfilled consultations: NO_SHOW / (COMPLETED + NO_SHOW)
            </CardDescription>
          </div>

          {!isLoading && (
            <div className="text-right">
              <div className="text-2xl font-extrabold tracking-tight text-foreground font-mono">
                {overallRate}%
              </div>
              <span className="text-[10px] text-muted-foreground">30-Day Avg Rate</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 flex-1 flex flex-col justify-end">
        {isLoading ? (
          <div className="h-[200px] w-full flex items-end gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-full w-full rounded-md" />
            ))}
          </div>
        ) : !hasData ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 border rounded-xl border-dashed bg-muted/10 text-muted-foreground text-xs space-y-2">
            <UserX className="h-7 w-7 text-muted-foreground/50 mb-1" />
            <p className="font-semibold text-foreground">No Concluded Consultations Yet</p>
            <p className="max-w-xs text-[11px] text-muted-foreground">
              When appointments reach COMPLETED or NO_SHOW status, historical 8-week trend lines will plot automatically.
            </p>
          </div>
        ) : (
          <div className="h-[200px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="noShowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="noShowRate"
                  name="No-Show %"
                  stroke="#f43f5e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#noShowGradient)"
                  dot={{ r: 3, fill: "#f43f5e" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

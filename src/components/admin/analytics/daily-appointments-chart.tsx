"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Calendar, BarChart3, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyAppointmentStat } from "@/app/actions/admin";

interface DailyAppointmentsChartProps {
  data: DailyAppointmentStat[];
  isLoading?: boolean;
}

export function DailyAppointmentsChart({ data, isLoading }: DailyAppointmentsChartProps) {
  const hasData = data && data.some((d) => d.total > 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: DailyAppointmentStat = payload[0].payload;
      return (
        <div className="rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur-xs text-xs space-y-1.5 min-w-[170px]">
          <div className="font-bold text-foreground border-b pb-1 flex items-center justify-between">
            <span>{item.date}</span>
            <span className="font-mono text-muted-foreground">{item.fullDate}</span>
          </div>
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Consultations:</span>
              <strong className="font-mono text-foreground">{item.total}</strong>
            </div>
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span>● Completed:</span>
              <strong className="font-mono">{item.completed}</strong>
            </div>
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span>● Scheduled:</span>
              <strong className="font-mono">{item.confirmed}</strong>
            </div>
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
              <span>● No-Show:</span>
              <strong className="font-mono">{item.noShow}</strong>
            </div>
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span>● Cancelled:</span>
              <strong className="font-mono">{item.cancelled}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-xs overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Appointments Volume (Last 30 Days)
            </CardTitle>
            <CardDescription className="text-xs">
              Daily booked patient consultation volume breakdown across all clinic departments
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-[280px] w-full flex flex-col justify-end gap-2 p-4">
            <div className="flex items-end gap-2 h-full w-full">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="w-full"
                  style={{ height: `${Math.max(15, Math.sin(i) * 80 + 20)}%` }}
                />
              ))}
            </div>
          </div>
        ) : !hasData ? (
          <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 border rounded-xl border-dashed bg-muted/10 text-muted-foreground text-xs space-y-2">
            <Calendar className="h-8 w-8 text-muted-foreground/50 mb-1" />
            <p className="font-semibold text-foreground">No Consultations Recorded (30 Days)</p>
            <p className="max-w-xs text-[11px] text-muted-foreground leading-relaxed">
              When patient consultations are booked or completed, daily volume metrics and status breakdowns will render here.
            </p>
          </div>
        ) : (
          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="#10b981"
                  stackId="status"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="confirmed"
                  name="Scheduled"
                  fill="#3b82f6"
                  stackId="status"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="noShow"
                  name="No-Show"
                  fill="#f43f5e"
                  stackId="status"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="cancelled"
                  name="Cancelled"
                  fill="#f59e0b"
                  stackId="status"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

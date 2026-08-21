"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WorkingHours, DaySchedule } from "@/lib/validations/admin";

interface WorkingHoursEditorProps {
  value: WorkingHours;
  onChange: (value: WorkingHours) => void;
}

const WEEKDAYS: { key: keyof WorkingHours; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export function WorkingHoursEditor({ value, onChange }: WorkingHoursEditorProps) {
  const handleDayToggle = (day: keyof WorkingHours, isWorking: boolean) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        isWorking,
      },
    });
  };

  const handleTimeChange = (
    day: keyof WorkingHours,
    field: "start" | "end",
    timeVal: string
  ) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        [field]: timeVal,
      },
    });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Weekday Schedule
        </span>
        <span className="text-xs text-muted-foreground">Operating Hours</span>
      </div>

      <div className="space-y-2.5 divide-y divide-border/40">
        {WEEKDAYS.map(({ key, label }) => {
          const dayData: DaySchedule = value[key] || {
            isWorking: false,
            start: "09:00",
            end: "17:00",
          };

          return (
            <div
              key={key}
              className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3 w-36">
                <Switch
                  id={`toggle-${key}`}
                  checked={dayData.isWorking}
                  onCheckedChange={(checked) => handleDayToggle(key, checked)}
                />
                <Label
                  htmlFor={`toggle-${key}`}
                  className={`text-xs font-medium cursor-pointer ${
                    dayData.isWorking ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </Label>
              </div>

              {dayData.isWorking ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    className="h-8 w-28 text-xs font-mono"
                    value={dayData.start || "09:00"}
                    onChange={(e) => handleTimeChange(key, "start", e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="time"
                    className="h-8 w-28 text-xs font-mono"
                    value={dayData.end || "17:00"}
                    onChange={(e) => handleTimeChange(key, "end", e.target.value)}
                  />
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic py-1">
                  Off Duty / Closed
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

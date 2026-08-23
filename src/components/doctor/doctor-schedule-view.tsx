"use client";

import * as React from "react";
import Link from "next/link";
import { format, isToday as checkIsToday } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Loader2,
  Sparkles,
  Stethoscope,
  User,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/doctor/urgency-badge";
import { PreVisitSummaryData } from "@/lib/validations/ai";
import { cn } from "@/lib/utils";
import { LiveQueuePanel } from "@/components/doctor/live-queue-panel";
import { markAppointmentNoShowAction } from "@/app/actions/doctor";
import { PageTransition } from "@/components/ui/page-transition";

interface AppointmentItem {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
  symptomText: string;
  preVisitSummaryStatus?: string | null;
  preVisitSummaryJson?: any;
  patient: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
}

interface DoctorScheduleViewProps {
  doctorId: string;
  initialDateString: string;
  doctorName: string;
  specialization: string;
  appointments: AppointmentItem[];
  stats: {
    total: number;
    highUrgency: number;
    completed: number;
  };
}

export function DoctorScheduleView({
  doctorId,
  initialDateString,
  doctorName,
  specialization,
  appointments: initialAppointments,
  stats: initialStats,
}: DoctorScheduleViewProps) {
  const [selectedDate, setSelectedDate] = React.useState<string>(initialDateString);
  const [appointments, setAppointments] = React.useState<AppointmentItem[]>(initialAppointments);
  const [stats, setStats] = React.useState(initialStats);
  const [isLoading, setIsLoading] = React.useState(false);
  const [markingNoShowId, setMarkingNoShowId] = React.useState<string | null>(null);

  const parsedDate = React.useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const isCurrentDay = React.useMemo(() => {
    return checkIsToday(parsedDate);
  }, [parsedDate]);

  const handleMarkNoShow = async (appointmentId: string) => {
    setMarkingNoShowId(appointmentId);
    try {
      const res = await markAppointmentNoShowAction(appointmentId);
      if (!res.success) {
        toast.error(res.error || "Failed to mark as No-Show.");
      } else {
        toast.success(res.message || "Appointment marked as No-Show.");
        setAppointments((prev) =>
          prev.map((a) => (a.id === appointmentId ? { ...a, status: "NO_SHOW" } : a))
        );
      }
    } catch (err) {
      toast.error((err as Error).message || "An error occurred.");
    } finally {
      setMarkingNoShowId(null);
    }
  };

  // Handle date change
  const handleDateChange = async (newDateStr: string) => {
    setSelectedDate(newDateStr);
    setIsLoading(true);
    try {
      const { getDoctorScheduleAction } = await import("@/app/actions/doctor");
      const res = await getDoctorScheduleAction(newDateStr);
      if (res.success && res.data) {
        setAppointments(res.data.appointments as unknown as AppointmentItem[]);
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Failed to load appointments for date:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevDay = () => {
    const prev = new Date(parsedDate);
    prev.setDate(prev.getDate() - 1);
    handleDateChange(format(prev, "yyyy-MM-dd"));
  };

  const handleNextDay = () => {
    const next = new Date(parsedDate);
    next.setDate(next.getDate() + 1);
    handleDateChange(format(next, "yyyy-MM-dd"));
  };

  const handleToday = () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    handleDateChange(todayStr);
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header & Date Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-2xl p-5 sm:p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Doctor Clinical Portal
            </span>
            {isCurrentDay && (
              <Badge variant="outline" className="text-[11px] font-medium border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                Today&apos;s Schedule
              </Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {doctorName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Specialist in <span className="font-semibold text-foreground">{specialization}</span> • Manage daily patient flow &amp; intake briefs
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={isCurrentDay ? "default" : "outline"}
            size="sm"
            onClick={handleToday}
            className="text-xs h-9 font-medium"
          >
            Today
          </Button>

          <div className="flex items-center rounded-lg border bg-background shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={handlePrevDay}
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="px-3 py-1 flex items-center gap-2 text-xs font-semibold border-x">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && handleDateChange(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={handleNextDay}
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row (4 Stat Cards matching Figma Doctor Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s Appointments</CardDescription>
            <CardTitle className="text-2xl font-extrabold flex items-center justify-between font-mono">
              {stats.total}
              <CalendarDays className="h-5 w-5 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Scheduled for {format(parsedDate, "MMM d")}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Needs Review</CardDescription>
            <CardTitle className="text-2xl font-extrabold flex items-center justify-between font-mono text-amber-600 dark:text-amber-400">
              {appointments.filter(a => a.preVisitSummaryStatus === "PENDING" || a.status === "NEEDS_RESCHEDULE").length}
              <Sparkles className="h-5 w-5 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Pending intake / reschedule triage
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed Visits</CardDescription>
            <CardTitle className="text-2xl font-extrabold flex items-center justify-between font-mono text-emerald-600 dark:text-emerald-400">
              {stats.completed}
              <CheckCircle2 className="h-5 w-5 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Out of {stats.total} scheduled
          </CardContent>
        </Card>

        <Card className={cn("bg-card shadow-xs", stats.highUrgency > 0 && "border-red-500/40 bg-red-500/5")}>
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">High Urgency Today</CardDescription>
            <CardTitle className="text-2xl font-extrabold flex items-center justify-between font-mono text-red-600 dark:text-red-400">
              {stats.highUrgency}
              <AlertTriangle className="h-5 w-5 opacity-80" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Prioritized at top of queue
          </CardContent>
        </Card>
      </div>

      {/* Live Pusher Queue Panel (Today's Consultations) */}
      {isCurrentDay && <LiveQueuePanel doctorId={doctorId} />}

      {/* Appointments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {format(parsedDate, "EEEE, MMMM d, yyyy")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {appointments.length === 1
                ? "1 patient consultation scheduled"
                : `${appointments.length} patient consultations scheduled`}
              {isCurrentDay && stats.highUrgency > 0 && " • High urgency cases sorted to top"}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card">
            <Sparkles className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium text-foreground">Loading consultations...</p>
          </div>
        ) : appointments.length === 0 ? (
          <Card className="border-dashed border-2 py-12 text-center bg-card/40">
            <CardContent className="flex flex-col items-center justify-center">
              <Calendar className="h-10 w-10 text-muted-foreground opacity-40 mb-3" />
              <CardTitle className="text-base font-semibold text-foreground">
                No appointments for this date
              </CardTitle>
              <CardDescription className="text-xs max-w-sm mt-1">
                There are currently no patient consultations booked for {format(parsedDate, "MMMM d, yyyy")}. Select another date from the controls above.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {appointments.map((appt, index) => {
              const startObj = new Date(appt.startTime);
              const endObj = new Date(appt.endTime);
              const summary = appt.preVisitSummaryJson as PreVisitSummaryData | null;
              const isHigh = summary?.urgency === "High";

              return (
                <Card
                  key={appt.id}
                  className={cn(
                    "transition-all duration-200 hover:shadow-md border",
                    isHigh && isCurrentDay
                      ? "border-red-500/40 bg-red-500/[0.02] shadow-xs"
                      : "bg-card hover:border-primary/40"
                  )}
                >
                  <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Patient Info & Time */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm",
                          isHigh
                            ? "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"
                            : "bg-primary/10 text-primary border border-primary/20"
                        )}
                      >
                        {appt.patient.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-foreground truncate">
                            {appt.patient.name}
                          </h3>

                          {/* Urgency Badge */}
                          <UrgencyBadge
                            urgency={summary?.urgency}
                            status={appt.preVisitSummaryStatus}
                          />

                          {appt.status === "NEEDS_RESCHEDULE" && (
                            <Badge variant="destructive" className="text-[10px]">
                              Needs Reschedule
                            </Badge>
                          )}

                          {appt.status === "NO_SHOW" && (
                            <Badge variant="destructive" className="text-[10px] bg-rose-600">
                              No-Show
                            </Badge>
                          )}

                          {appt.status === "COMPLETED" && (
                            <Badge className="bg-emerald-600 text-white text-[10px]">
                              Completed
                            </Badge>
                          )}
                        </div>

                        {/* Timing Window */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                            <Clock className="h-3.5 w-3.5 text-primary" />
                            {format(startObj, "hh:mm a")} - {format(endObj, "hh:mm a")}
                          </span>

                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {appt.patient.email}
                          </span>
                        </div>

                        {/* Chief Complaint / Symptoms Preview */}
                        {summary?.chiefComplaint ? (
                          <p className="text-xs text-muted-foreground pt-1 line-clamp-1">
                            <strong className="text-foreground font-medium">Chief Complaint:</strong>{" "}
                            {summary.chiefComplaint}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground pt-1 italic line-clamp-1">
                            &quot;{appt.symptomText}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {appt.status === "CONFIRMED" && startObj < new Date() && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkNoShow(appt.id)}
                          disabled={markingNoShowId === appt.id}
                          className="text-xs h-9 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 gap-1.5"
                        >
                          {markingNoShowId === appt.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserX className="h-3.5 w-3.5" />
                          )}
                          Mark No-Show
                        </Button>
                      )}

                      <Button size="sm" variant="outline" asChild className="text-xs h-9 font-medium group">
                        <Link href={`/doctor/appointments/${appt.id}`}>
                          View Intake Brief
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

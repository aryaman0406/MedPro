"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Calendar, CheckCircle2, Clock, Mail, Phone, RefreshCw, Stethoscope, TrendingUp, User, UserPlus, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminDashboardStatsAction } from "@/app/actions/admin";

interface RescheduleAppointment {
  id: string;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  symptomText: string;
  patient: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  doctor: {
    specialization: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = React.useState<{
    totalDoctors: number;
    totalPatients: number;
    appointmentsTodayCount: number;
    needsRescheduleCount: number;
    needsRescheduleAppointments: RescheduleAppointment[];
  } | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);

  const fetchStats = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAdminDashboardStatsAction();
      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to load dashboard metrics.");
      } else {
        setStats(res.data as unknown as typeof stats);
      }
    } catch (err) {
      toast.error("An error occurred while loading dashboard stats.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    {
      title: "Total Doctors",
      value: stats?.totalDoctors ?? 0,
      subtext: "Certified Specialists",
      icon: Stethoscope,
      href: "/admin/doctors",
      color: "text-blue-500",
    },
    {
      title: "Total Patients",
      value: stats?.totalPatients ?? 0,
      subtext: "Registered Care Seekers",
      icon: Users,
      color: "text-cyan-500",
    },
    {
      title: "Appointments Today",
      value: stats?.appointmentsTodayCount ?? 0,
      subtext: "Scheduled consultations",
      icon: Calendar,
      color: "text-emerald-500",
    },
    {
      title: "Needs Reschedule",
      value: stats?.needsRescheduleCount ?? 0,
      subtext: stats && stats.needsRescheduleCount > 0 ? "Action Required" : "Queue Clear",
      icon: AlertTriangle,
      color: stats && stats.needsRescheduleCount > 0 ? "text-amber-500" : "text-muted-foreground",
      alert: stats && stats.needsRescheduleCount > 0,
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Clinic Administration Dashboard</h1>
            <Badge variant="outline" className="font-mono text-xs">ADMIN PORTAL</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time practice operations, specialist capacity, and appointment triage management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/doctors" className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Manage Doctors
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`relative overflow-hidden transition-all ${
                stat.alert ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm" : ""
              }`}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-background border ${stat.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
                    {stat.alert && (
                      <Badge variant="warning" className="text-[10px] animate-pulse">
                        Requires Action
                      </Badge>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1.5">{stat.subtext}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Appointments Requiring Rescheduling Section */}
      <Card className={stats && stats.needsRescheduleCount > 0 ? "border-amber-500/40" : ""}>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${stats && stats.needsRescheduleCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                Appointments Requiring Reschedule
              </CardTitle>
              <CardDescription className="text-xs">
                Appointments flagged because a doctor registered a leave or blackout date overlapping a previously confirmed slot.
              </CardDescription>
            </div>
            {stats && stats.needsRescheduleCount > 0 && (
              <Badge variant="warning" className="font-mono text-xs">
                {stats.needsRescheduleCount} Flagged
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Patient</TableHead>
                <TableHead className="w-[200px]">Doctor &amp; Specialization</TableHead>
                <TableHead className="w-[180px]">Original Slot Time</TableHead>
                <TableHead>Symptoms / Notes</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="text-right w-[110px]">Triage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : !stats || stats.needsRescheduleAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-xs">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      <span className="font-medium text-foreground">No appointments currently need rescheduling</span>
                      <span className="text-[11px]">When doctor leaves overlap existing bookings, they will appear here automatically.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                stats.needsRescheduleAppointments.map((appt) => {
                  const startTimeObj = new Date(appt.startTime);
                  return (
                    <TableRow key={appt.id} className="bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                      <TableCell className="font-semibold text-xs">
                        <div className="flex flex-col">
                          <span className="text-foreground">{appt.patient.name}</span>
                          <span className="text-[11px] font-normal text-muted-foreground">{appt.patient.email}</span>
                          {appt.patient.phone && (
                            <span className="text-[10px] text-muted-foreground">{appt.patient.phone}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{appt.doctor.user.name}</span>
                          <span className="text-[11px] text-primary">{appt.doctor.specialization}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-foreground">
                        <div className="flex flex-col">
                          <span className="font-semibold">{format(startTimeObj, "MMM dd, yyyy")}</span>
                          <span className="text-muted-foreground text-[11px]">{format(startTimeObj, "hh:mm a")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {appt.symptomText || "General consultation"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wider">
                          NEEDS_RESCHEDULE
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" className="h-7 text-xs font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400">
                          Reschedule →
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

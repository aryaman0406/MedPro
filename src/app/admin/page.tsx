"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Inbox,
  Mail,
  Percent,
  Phone,
  RefreshCw,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAdminDashboardStatsAction,
  getEmailDeliveryStatsAction,
  getAdminAnalyticsAction,
  AdminAnalyticsData,
} from "@/app/actions/admin";
import { EmailDeliveryDashboard } from "@/components/admin/email-delivery-table";
import { DailyAppointmentsChart } from "@/components/admin/analytics/daily-appointments-chart";
import { DoctorUtilizationCard } from "@/components/admin/analytics/doctor-utilization-card";
import { NoShowTrendChart } from "@/components/admin/analytics/no-show-trend-chart";
import { PageTransition } from "@/components/ui/page-transition";

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

  const [analytics, setAnalytics] = React.useState<AdminAnalyticsData | null>(null);

  const [emailData, setEmailData] = React.useState<{
    stats: {
      sent: number;
      pending: number;
      failed: number;
      dead: number;
      total: number;
    };
    deadEmails: any[];
  } | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);

  const fetchDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [dashRes, analyticsRes, emailRes] = await Promise.all([
        getAdminDashboardStatsAction(),
        getAdminAnalyticsAction(),
        getEmailDeliveryStatsAction(),
      ]);

      if (dashRes.success && dashRes.data) {
        setStats(dashRes.data as unknown as typeof stats);
      }
      if (analyticsRes.success && analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }
      if (emailRes.success && emailRes.data) {
        setEmailData(emailRes.data as unknown as typeof emailData);
      }
    } catch (err) {
      toast.error("An error occurred while loading analytics metrics.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const summary = analytics?.summary;

  const statCards = [
    {
      title: "Active Specialists",
      value: summary ? summary.activeDoctorsCount : (stats?.totalDoctors ?? 0),
      subtext: "Certified Clinical Doctors",
      icon: Stethoscope,
      href: "/admin/doctors",
      color: "text-blue-500",
    },
    {
      title: "30-Day Consultations",
      value: summary ? summary.totalAppointments30d : (stats?.totalPatients ?? 0),
      subtext: summary ? `${summary.completedAppointments30d} completed visits` : "Total Clinic Volume",
      icon: BarChart3,
      color: "text-cyan-500",
    },
    {
      title: "Avg Specialist Utilization",
      value: summary ? `${summary.averageDoctorUtilization}%` : "0%",
      subtext: "Booked vs Working Capacity",
      icon: TrendingUp,
      color: "text-emerald-500",
    },
    {
      title: "Patient No-Show Rate",
      value: summary ? `${summary.overallNoShowRate}%` : "0%",
      subtext: "Unattended Consultations",
      icon: UserX,
      color: summary && summary.overallNoShowRate > 15 ? "text-rose-500" : "text-amber-500",
      alert: summary && summary.overallNoShowRate > 20,
    },
  ];

  return (
    <PageTransition className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight font-heading">Clinic Administration</h1>
            <Badge variant="outline" className="font-mono text-xs">ADMIN PORTAL</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Overview of whole-clinic operational efficiency, specialist capacity utilization, and recent analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Analytics
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/doctors" className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Manage Doctors
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Top KPI Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`relative overflow-hidden transition-all shadow-2xs ${
                stat.alert ? "border-rose-500/50 bg-rose-500/5 dark:bg-rose-500/10" : ""
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
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-extrabold tracking-tight font-mono">{stat.value}</div>
                    {stat.alert && (
                      <Badge variant="destructive" className="text-[10px]">
                        High
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

      {/* Main Tabs: Practice Analytics & Operations vs Email Delivery */}
      <Tabs defaultValue="analytics" className="w-full space-y-6">
        <TabsList className="grid w-full sm:w-[420px] grid-cols-2">
          <TabsTrigger value="analytics" className="text-xs flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            <span>Practice Analytics</span>
            {stats && stats.needsRescheduleCount > 0 && (
              <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
                {stats.needsRescheduleCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="emails" className="text-xs flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            <span>Email Delivery Health</span>
            {emailData && emailData.stats.dead > 0 && (
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                {emailData.stats.dead}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Practice Analytics & Reschedule Triage */}
        <TabsContent value="analytics" className="space-y-6">
          {/* 30-Day Appointments Bar Chart */}
          <DailyAppointmentsChart
            data={analytics?.dailyAppointments || []}
            isLoading={isLoading}
          />

          {/* 2-Column Grid: Doctor Utilization & No-Show Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DoctorUtilizationCard
              data={analytics?.doctorUtilization || []}
              isLoading={isLoading}
            />

            <NoShowTrendChart
              overallRate={summary?.overallNoShowRate ?? 0}
              data={analytics?.noShowTrend || []}
              isLoading={isLoading}
            />
          </div>

          {/* Integrated Needs Reschedule Triage Table */}
          <Card className={stats && stats.needsRescheduleCount > 0 ? "border-amber-500/40" : ""}>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${stats && stats.needsRescheduleCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
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
                      </TableRow>
                    ))
                  ) : !stats || stats.needsRescheduleAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-xs">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
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
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Email Delivery Dashboard */}
        <TabsContent value="emails">
          {emailData ? (
            <EmailDeliveryDashboard
              stats={emailData.stats}
              deadEmails={emailData.deadEmails}
            />
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}

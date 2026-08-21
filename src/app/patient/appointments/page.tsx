"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  HeartPulse,
  HelpCircle,
  Loader2,
  Pill,
  RefreshCw,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { getPatientAppointmentsAction } from "@/app/actions/booking";
import { AppointmentStatus } from "@prisma/client";
import { PostVisitSummaryData, PrescriptionItem } from "@/lib/validations/ai";
import { GoogleCalendarCard } from "@/components/calendar/google-calendar-card";
import { PatientQueueCard } from "@/components/patient/patient-queue-card";
import { PageTransition } from "@/components/ui/page-transition";

interface PatientAppointment {
  id: string;
  doctorId: string;
  startTime: Date | string;
  endTime: Date | string;
  status: AppointmentStatus;
  symptomText: string;
  checkedInAt?: Date | string | null;
  postVisitNotes?: string | null;
  postVisitSummaryStatus?: string | null;
  postVisitSummaryJson?: any;
  prescriptionJson?: any;
  doctor: {
    id: string;
    specialization: string;
    user: {
      name: string;
      email: string;
      phone?: string | null;
    };
  };
}

function CompletedVisitCarePlan({ appt }: { appt: PatientAppointment }) {
  const postSummary = appt.postVisitSummaryJson as PostVisitSummaryData | null;
  const prescriptions = appt.prescriptionJson as PrescriptionItem[] | null;
  const [expanded, setExpanded] = React.useState(true);

  if (!postSummary && !appt.postVisitNotes && (!prescriptions || prescriptions.length === 0)) {
    return null;
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-4 text-xs mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-bold">
          <HeartPulse className="h-4 w-4 text-primary" />
          <span>Post-Consultation Care Plan &amp; Summary</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <>
              Hide Details <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              View Care Plan <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 pt-1 animate-in fade-in-50 duration-200">
          {/* Patient-Friendly Plain Summary */}
          {postSummary?.plainSummary ? (
            <div className="rounded-xl bg-card border p-3.5 space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Doctor&apos;s Summary
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                {postSummary.plainSummary}
              </p>
            </div>
          ) : appt.postVisitNotes ? (
            <div className="rounded-xl bg-card border p-3.5 space-y-1">
              <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-primary">
                <FileText className="h-3.5 w-3.5" /> Doctor&apos;s Notes
              </span>
              <p className="text-muted-foreground leading-relaxed text-xs">
                {appt.postVisitNotes}
              </p>
            </div>
          ) : null}

          {/* Medication Schedule */}
          {postSummary?.medicationSchedule && postSummary.medicationSchedule.length > 0 ? (
            <div className="space-y-2">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-primary" /> Medication Schedule:
              </span>
              <div className="divide-y rounded-xl border bg-card overflow-hidden">
                {postSummary.medicationSchedule.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-bold text-foreground text-xs">{item.medicine}</span>
                      <p className="text-muted-foreground text-[11px] mt-0.5">{item.whenToTake}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0 font-medium">
                      {item.durationDays} day(s)
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : prescriptions && prescriptions.length > 0 ? (
            <div className="space-y-2">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Pill className="h-3.5 w-3.5 text-primary" /> Prescriptions:
              </span>
              <div className="divide-y rounded-xl border bg-card overflow-hidden">
                {prescriptions.map((rx, idx) => (
                  <div key={idx} className="p-3 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-bold text-foreground text-xs">
                        {rx.medicineName} ({rx.dosage})
                      </span>
                      {rx.instructions && (
                        <p className="text-muted-foreground text-[11px] mt-0.5">{rx.instructions}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {rx.frequencyPerDay}x daily • {rx.durationDays} days
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Follow-up Steps */}
          {postSummary?.followUpSteps && postSummary.followUpSteps.length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Next Steps &amp; Follow-up:
              </span>
              <div className="space-y-1.5">
                {postSummary.followUpSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-lg border bg-card p-2.5 text-xs text-muted-foreground">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[9px] mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-foreground font-medium">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PatientAppointmentsPage() {
  const [upcoming, setUpcoming] = React.useState<PatientAppointment[]>([]);
  const [past, setPast] = React.useState<PatientAppointment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchAppointments = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPatientAppointmentsAction();
      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to load appointments.");
      } else {
        setUpcoming(res.data.upcoming as unknown as PatientAppointment[]);
        setPast(res.data.past as unknown as PatientAppointment[]);
      }
    } catch (err) {
      toast.error("An error occurred while fetching your appointments.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="success" className="text-[10px] uppercase font-bold tracking-wider">Confirmed</Badge>;
      case "NEEDS_RESCHEDULE":
        return <Badge variant="warning" className="text-[10px] uppercase font-bold tracking-wider">Needs Reschedule</Badge>;
      case "COMPLETED":
        return <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">Cancelled</Badge>;
      case "NO_SHOW":
        return <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">No Show</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const renderAppointmentCard = (appt: PatientAppointment) => {
    const startTimeObj = new Date(appt.startTime);
    const endTimeObj = new Date(appt.endTime);
    const isCompleted = appt.status === "COMPLETED";

    return (
      <Card key={appt.id} className="hover:border-primary/40 transition-all shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">{appt.doctor.user.name}</CardTitle>
                <Badge variant="outline" className="text-xs font-semibold text-primary mt-0.5">
                  {appt.doctor.specialization}
                </Badge>
              </div>
            </div>
            {getStatusBadge(appt.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {format(startTimeObj, "EEE, MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-foreground">
                {format(startTimeObj, "hh:mm a")} - {format(endTimeObj, "hh:mm a")}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" /> Reason for Visit:
            </span>
            <p className="text-muted-foreground italic pl-5 line-clamp-2">
              &quot;{appt.symptomText}&quot;
            </p>
          </div>

          {appt.status === "NEEDS_RESCHEDULE" && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                Your doctor has registered leave on this date. Please choose a new appointment time.
              </span>
            </div>
          )}

          {/* Live Check-In & Real-Time Queue Position Tracker */}
          <PatientQueueCard
            appointmentId={appt.id}
            doctorId={appt.doctorId || appt.doctor.id}
            doctorName={appt.doctor.user.name}
            startTime={appt.startTime}
            status={appt.status}
            initialCheckedInAt={appt.checkedInAt}
          />

          {/* Completed Care Plan Accordion / Details */}
          {isCompleted && <CompletedVisitCarePlan appt={appt} />}
        </CardContent>
      </Card>
    );
  };

  return (
    <PageTransition className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Manage your booked medical consultations and view post-visit care plans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAppointments}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" asChild className="gap-1.5 text-xs">
            <Link href="/patient/find-doctor">
              <CalendarPlus className="h-3.5 w-3.5" />
              Book New Appointment
            </Link>
          </Button>
        </div>
      </div>

      {/* Google Calendar Sync Integration Card */}
      <GoogleCalendarCard
        title="Personal Google Calendar Sync"
        description="Sync your upcoming doctor appointments to Google Calendar with automatic reminder notifications."
      />

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full sm:w-80 grid-cols-2">
          <TabsTrigger value="upcoming" className="text-xs flex items-center gap-1.5">
            <span>Upcoming</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {upcoming.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="past" className="text-xs flex items-center gap-1.5">
            <span>Past History</span>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {past.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="p-6 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full" />
                </Card>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mb-3 opacity-40 text-primary" />
                <CardTitle className="text-base font-bold text-foreground">
                  No Upcoming Consultations
                </CardTitle>
                <CardDescription className="max-w-sm mt-1 mb-4 text-xs">
                  You do not have any active appointments scheduled. Search available specialists to book your next consultation.
                </CardDescription>
                <Button size="sm" asChild>
                  <Link href="/patient/find-doctor">Browse Available Doctors</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcoming.map(renderAppointmentCard)}
            </div>
          )}
        </TabsContent>

        {/* Past Tab */}
        <TabsContent value="past" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="p-6 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </Card>
              ))}
            </div>
          ) : past.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground text-xs">
                No past consultations on record.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {past.map(renderAppointmentCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}

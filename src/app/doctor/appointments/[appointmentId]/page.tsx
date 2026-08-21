import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Mail,
  Phone,
  Pill,
  RefreshCw,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";

import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { getDoctorAppointmentDetailAction } from "@/app/actions/doctor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/doctor/urgency-badge";
import { PreVisitSummaryData, PostVisitSummaryData, PrescriptionItem } from "@/lib/validations/ai";
import { CompleteVisitDialog } from "@/components/doctor/complete-visit-dialog";
import { RetryPostVisitSummaryButton } from "@/components/doctor/retry-post-visit-summary-button";

export default async function DoctorAppointmentDetailPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=/doctor/appointments/${appointmentId}`);
  }

  if (session.user.role !== Role.DOCTOR && session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const res = await getDoctorAppointmentDetailAction(appointmentId);

  if (!res.success || !res.data) {
    notFound();
  }

  const appointment = res.data;
  const startTimeObj = new Date(appointment.startTime);
  const endTimeObj = new Date(appointment.endTime);
  const preSummary = appointment.preVisitSummary as PreVisitSummaryData | null;
  const postSummary = appointment.postVisitSummary as PostVisitSummaryData | null;
  const prescriptions = appointment.prescription as PrescriptionItem[] | null;
  const isHigh = preSummary?.urgency === "High";
  const isCompleted = appointment.status === "COMPLETED";

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Top Back Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-2 text-xs text-muted-foreground hover:text-foreground w-fit">
          <Link href="/doctor/schedule">
            <ArrowLeft className="h-4 w-4" />
            Back to Doctor Schedule
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <UrgencyBadge
            urgency={preSummary?.urgency}
            status={appointment.preVisitSummaryStatus}
          />
          <Badge
            variant={
              isCompleted
                ? "secondary"
                : appointment.status === "CONFIRMED"
                ? "default"
                : appointment.status === "NEEDS_RESCHEDULE"
                ? "destructive"
                : "outline"
            }
            className="text-xs"
          >
            {appointment.status.replace("_", " ")}
          </Badge>

          {/* Complete Visit Button / Dialog */}
          <CompleteVisitDialog
            appointmentId={appointment.id}
            patientName={appointment.patient.name}
            startTime={appointment.startTime}
            isAlreadyCompleted={isCompleted}
          />
        </div>
      </div>

      {/* Main Encounter Header */}
      <div className="bg-card border rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 text-lg font-bold">
              {appointment.patient.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {appointment.patient.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clinical Encounter Record • ID: <span className="font-mono">{appointment.id.substring(0, 12)}...</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {format(startTimeObj, "EEEE, MMMM do, yyyy")}
            </span>
            <span className="font-mono text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {format(startTimeObj, "hh:mm a")} - {format(endTimeObj, "hh:mm a")}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Patient Basic Info Card */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Patient Profile
            </CardTitle>
            <CardDescription className="text-xs">Demographics &amp; contact info</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 text-xs">
            <div className="space-y-1 pb-3 border-b">
              <span className="text-muted-foreground text-[11px] block">Full Name</span>
              <span className="font-semibold text-foreground text-sm">{appointment.patient.name}</span>
            </div>

            <div className="space-y-1 pb-3 border-b">
              <span className="text-muted-foreground text-[11px] block">Email Address</span>
              <span className="font-mono text-foreground break-all flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {appointment.patient.email}
              </span>
            </div>

            <div className="space-y-1 pb-3 border-b">
              <span className="text-muted-foreground text-[11px] block">Phone Number</span>
              <span className="font-mono text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {appointment.patient.phone || "Not provided"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-muted-foreground text-[11px] block">Patient Since</span>
              <span className="text-foreground">
                {format(new Date(appointment.patient.createdAt), "MMMM yyyy")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right Columns: Pre-Visit Brief, Encounter Notes, Post-Visit AI Summary */}
        <div className="md:col-span-2 space-y-6">
          {/* 1. Post-Visit Completed Section (if visit completed) */}
          {isCompleted && (
            <>
              {/* Doctor Clinical Notes & Structured Prescriptions */}
              <Card className="border-emerald-500/30 bg-emerald-500/[0.02]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-base font-bold">
                          Encounter Notes &amp; Rx
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Saved clinical diagnosis and prescribed medications
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs">
                      Encounter Completed
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  {/* Clinical Notes */}
                  <div className="space-y-1.5">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> Doctor&apos;s Notes:
                    </span>
                    <div className="rounded-xl border bg-card p-3.5 leading-relaxed text-foreground whitespace-pre-wrap">
                      {appointment.postVisitNotes || "No notes documented."}
                    </div>
                  </div>

                  {/* Prescriptions Table */}
                  {prescriptions && prescriptions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Pill className="h-4 w-4 text-primary" /> Prescribed Medications:
                      </span>
                      <div className="divide-y rounded-xl border bg-card overflow-hidden">
                        {prescriptions.map((rx, idx) => (
                          <div key={idx} className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground text-sm">
                                {rx.medicineName}{" "}
                                <span className="font-mono text-xs text-primary font-normal">({rx.dosage})</span>
                              </span>
                              <Badge variant="secondary" className="text-[10px]">
                                {rx.frequencyPerDay}x daily • {rx.durationDays} day(s)
                              </Badge>
                            </div>
                            {rx.instructions && (
                              <p className="text-muted-foreground text-[11px] italic">
                                Note: {rx.instructions}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Post-Visit AI Summary */}
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">
                          Patient-Friendly AI Brief &amp; Care Plan
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Synthesized clinical summary and follow-up guidance
                        </CardDescription>
                      </div>
                    </div>

                    {appointment.postVisitSummaryStatus === "FAILED" && (
                      <RetryPostVisitSummaryButton appointmentId={appointment.id} />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  {postSummary ? (
                    <>
                      {/* Plain Summary */}
                      <div className="rounded-xl border bg-muted/20 p-4 space-y-1.5">
                        <span className="font-semibold text-primary block text-[11px] uppercase tracking-wider">
                          Patient Consultation Summary
                        </span>
                        <p className="leading-relaxed text-foreground">
                          {postSummary.plainSummary}
                        </p>
                      </div>

                      {/* Medication Schedule */}
                      {postSummary.medicationSchedule && postSummary.medicationSchedule.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-bold text-foreground block text-xs">
                            Medication Schedule:
                          </span>
                          <div className="divide-y rounded-xl border bg-card overflow-hidden">
                            {postSummary.medicationSchedule.map((item, idx) => (
                              <div key={idx} className="p-3 flex items-start justify-between gap-3">
                                <div>
                                  <span className="font-semibold text-foreground">{item.medicine}</span>
                                  <p className="text-muted-foreground text-[11px] mt-0.5">{item.whenToTake}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {item.durationDays} day(s)
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Steps */}
                      {postSummary.followUpSteps && postSummary.followUpSteps.length > 0 && (
                        <div className="space-y-2">
                          <span className="font-bold text-foreground block text-xs">
                            Follow-up Action Steps:
                          </span>
                          <div className="space-y-1.5">
                            {postSummary.followUpSteps.map((step, idx) => (
                              <div key={idx} className="flex items-start gap-2.5 rounded-lg border bg-muted/20 p-2.5">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                                  {idx + 1}
                                </span>
                                <span className="text-foreground">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : appointment.postVisitSummaryStatus === "PENDING" ? (
                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 text-center text-xs text-blue-700 dark:text-blue-300">
                      <Sparkles className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                      <p className="font-semibold text-sm">Synthesizing Patient Brief...</p>
                      <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                        Converting clinical notes into warm, patient-friendly guidance and medication schedules. Refresh shortly.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border bg-muted/40 p-5 text-center text-xs text-muted-foreground space-y-3">
                      <AlertCircle className="h-5 w-5 mx-auto opacity-60" />
                      <div>
                        <p className="font-semibold text-foreground">Post-Visit Summary Unavailable</p>
                        <p className="max-w-sm mx-auto mt-1">
                          The automated AI summary could not be generated. You can click &quot;Retry AI Summary&quot; above to re-generate.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Scheduled Medication Reminders */}
              {appointment.medicationReminders && appointment.medicationReminders.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Scheduled Medication Reminders ({appointment.medicationReminders.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Background reminder instances queued for patient notification
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y rounded-xl border bg-card overflow-hidden text-xs max-h-56 overflow-y-auto">
                      {appointment.medicationReminders.map((rem: any) => (
                        <div key={rem.id} className="p-3 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">{rem.medicineName}</span>
                            {rem.dosage && <span className="text-muted-foreground ml-1">({rem.dosage})</span>}
                            <p className="text-muted-foreground font-mono text-[11px]">
                              {format(new Date(rem.scheduledFor), "EEE, MMM d, yyyy @ hh:mm a")}
                            </p>
                          </div>
                          <Badge
                            variant={rem.status === "SENT" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {rem.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* 2. Pre-Visit AI Analysis Card */}
          <Card
            className={
              isHigh
                ? "border-red-500/40 bg-red-500/[0.02] shadow-sm"
                : "border-primary/30 shadow-sm"
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">
                      Pre-Visit AI Intake Analysis
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Automated triage &amp; clinical question formulation
                    </CardDescription>
                  </div>
                </div>
                <UrgencyBadge
                  urgency={preSummary?.urgency}
                  status={appointment.preVisitSummaryStatus}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {preSummary ? (
                <>
                  <div className="rounded-xl border bg-card p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Stethoscope className="h-4 w-4" />
                      Chief Complaint
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                      {preSummary.chiefComplaint}
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-primary" />
                      Suggested Diagnostic Questions for Doctor
                    </h4>

                    <div className="space-y-2">
                      {preSummary.suggestedQuestions.map((question, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="text-foreground font-medium">{question}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : appointment.preVisitSummaryStatus === "PENDING" ? (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6 text-center text-xs text-blue-700 dark:text-blue-300">
                  <Sparkles className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                  <p className="font-semibold text-sm">AI Summary Generating...</p>
                  <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                    The pre-visit triage analysis and diagnostic questions are currently being processed. Refresh shortly.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/40 p-5 text-center text-xs text-muted-foreground">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1.5 opacity-60" />
                  <p className="font-semibold text-foreground">Summary Unavailable</p>
                  <p className="max-w-sm mx-auto mt-1">
                    An AI pre-visit intake could not be synthesized for this booking. Please review the verbatim symptom notes below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Verbatim Patient Symptoms Text */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Verbatim Patient Symptoms &amp; Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Submitted directly by the patient during booking intake
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-muted/30 p-4 text-xs sm:text-sm text-foreground leading-relaxed italic">
                &quot;{appointment.symptomText}&quot;
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDoctorSlotsAction } from "@/app/actions/booking";
import { rescheduleAppointmentWithTokenAction } from "@/app/actions/reschedule";
import { ComputedSlot } from "@/lib/validations/booking";
import { cn } from "@/lib/utils";

interface MagicRescheduleViewProps {
  token: string;
  patientName: string;
  doctorName: string;
  doctorId: string;
  specialization: string;
  originalStartTime: string | Date;
  symptomText: string;
}

export function MagicRescheduleView({
  token,
  patientName,
  doctorName,
  doctorId,
  specialization,
  originalStartTime,
  symptomText,
}: MagicRescheduleViewProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = React.useState<string>(
    format(addDays(new Date(), 1), "yyyy-MM-dd")
  );
  const [slots, setSlots] = React.useState<ComputedSlot[]>([]);
  const [isOffDuty, setIsOffDuty] = React.useState(false);
  const [isOnLeave, setIsOnLeave] = React.useState(false);
  const [leaveReason, setLeaveReason] = React.useState<string | undefined>();
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<ComputedSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const parsedDate = React.useMemo(() => {
    const parts = selectedDate.split("-").map(Number);
    const y = parts[0] > 1000 ? parts[0] : parts[2] > 1000 ? parts[2] : parts[0];
    const m = parts[1];
    const d = parts[0] > 1000 ? parts[2] : parts[2] > 1000 ? parts[0] : parts[2];
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  // Load available slots when date changes
  const loadSlots = React.useCallback(
    async (dateStr: string) => {
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      setErrorMsg(null);

      try {
        const res = await getDoctorSlotsAction(doctorId, dateStr);
        if (res.success && res.data) {
          setSlots(res.data.slots);
          setIsOffDuty(res.data.isOffDuty);
          setIsOnLeave(res.data.isOnLeave);
          setLeaveReason(res.data.leaveReason);
        } else {
          setSlots([]);
        }
      } catch (err) {
        console.error("Error loading doctor slots:", err);
      } finally {
        setIsLoadingSlots(false);
      }
    },
    [doctorId]
  );

  React.useEffect(() => {
    loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

  const handleDateChange = (newDateStr: string) => {
    setSelectedDate(newDateStr);
  };

  const handlePrevDay = () => {
    const prev = addDays(parsedDate, -1);
    if (prev >= new Date(new Date().setHours(0, 0, 0, 0))) {
      handleDateChange(format(prev, "yyyy-MM-dd"));
    }
  };

  const handleNextDay = () => {
    const next = addDays(parsedDate, 1);
    handleDateChange(format(next, "yyyy-MM-dd"));
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) {
      toast.error("Please select an available consultation slot.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await rescheduleAppointmentWithTokenAction({
        token,
        isoStartTime: selectedSlot.isoStartTime,
      });

      if (!res.success || !res.data) {
        setErrorMsg(res.error || "Failed to reschedule. Please try another slot.");
        toast.error(res.error || "Failed to reschedule.");
        return;
      }

      toast.success("Consultation successfully rescheduled!");
      router.push(`/patient/book/confirmation/${res.data.newAppointmentId}`);
    } catch (err) {
      setErrorMsg((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
              Instant One-Click Rescheduling
            </Badge>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Reschedule Your Visit with {doctorName}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hello <strong className="text-foreground">{patientName}</strong>, your doctor had to take clinical leave on{" "}
              <strong>{format(new Date(originalStartTime), "EEEE, MMMM do, yyyy")}</strong>. Please choose any new convenient slot below to immediately lock in your new consultation without having to sign in.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Doctor Info & Symptoms */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Medical Specialist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-foreground text-sm block">{doctorName}</span>
                <span className="text-primary font-medium">{specialization}</span>
              </div>

              <div className="pt-2 border-t space-y-1.5">
                <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Transferred Intake Symptoms:
                </span>
                <p className="text-muted-foreground italic bg-muted/40 p-2.5 rounded-lg text-[11px] leading-relaxed">
                  &quot;{symptomText}&quot;
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Date Navigation & Available Slots */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Select a New Date &amp; Time
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose from available consultation slots
                  </CardDescription>
                </div>

                {/* Date Navigator */}
                <div className="flex items-center rounded-lg border bg-background shadow-xs">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-r-none"
                    onClick={handlePrevDay}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="px-2.5 py-1 text-xs font-bold border-x">
                    <input
                      type="date"
                      value={selectedDate}
                      min={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => e.target.value && handleDateChange(e.target.value)}
                      className="bg-transparent border-none text-xs font-bold text-foreground focus:outline-none cursor-pointer"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-l-none"
                    onClick={handleNextDay}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {isLoadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <span>Checking doctor availability...</span>
                </div>
              ) : isOnLeave ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center text-xs text-amber-800 dark:text-amber-300">
                  <Clock className="h-6 w-6 mx-auto mb-1.5 text-amber-600" />
                  <p className="font-bold text-sm">Doctor on Scheduled Leave</p>
                  <p className="mt-1 max-w-xs mx-auto text-muted-foreground">
                    {leaveReason || "The specialist is unavailable on this date."} Please choose another day above.
                  </p>
                </div>
              ) : isOffDuty ? (
                <div className="rounded-xl border bg-muted/40 p-6 text-center text-xs text-muted-foreground">
                  <Calendar className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                  <p className="font-bold text-sm text-foreground">Clinic Closed / Off Duty</p>
                  <p className="mt-1 max-w-xs mx-auto">
                    The doctor does not have working hours configured for {format(parsedDate, "EEEE")}.
                  </p>
                </div>
              ) : slots.filter((s) => s.status === "AVAILABLE").length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                  <p className="font-bold text-sm text-foreground">All Slots Booked</p>
                  <p className="mt-1 max-w-xs mx-auto">
                    No available consultation windows remaining on this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Available Consultation Slots for {format(parsedDate, "EEEE, MMMM d")}:</span>
                    {selectedSlot && (
                      <Badge className="bg-emerald-600 text-white text-[11px]">
                        Selected: {selectedSlot.displayTime}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {slots.map((slot) => {
                      const isAvailable = slot.status === "AVAILABLE";
                      const isSelected = selectedSlot?.isoStartTime === slot.isoStartTime;

                      return (
                        <button
                          key={slot.isoStartTime}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={cn(
                            "rounded-xl border p-3 text-xs font-medium text-center transition-all flex flex-col items-center justify-center gap-1",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500 font-bold shadow-sm"
                              : isAvailable
                              ? "border-border bg-card hover:border-primary hover:bg-primary/5 text-foreground cursor-pointer"
                              : "border-border/50 bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed"
                          )}
                        >
                          <span className="font-mono font-bold text-sm">{slot.displayTime}</span>
                          <span className="text-[10px]">
                            {isSelected ? "Selected" : isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confirm Reschedule Button */}
              {selectedSlot && (
                <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    New Time: <strong className="text-foreground">{format(parsedDate, "MMMM d, yyyy")} @ {selectedSlot.displayTime}</strong>
                  </div>
                  <Button
                    onClick={handleConfirmReschedule}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Locking in Consultation...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm New Appointment Time
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

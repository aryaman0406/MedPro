"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Calendar as CalendarIcon, CheckCircle2, Clock, FileText, Loader2, Lock, ShieldCheck, Sparkles, Stethoscope, Timer, User, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDoctorForBookingAction,
  getDoctorSlotsAction,
  holdSlotAction,
  releaseSlotHoldAction,
  confirmBookingAction,
} from "@/app/actions/booking";
import { ComputedSlot } from "@/lib/validations/booking";
import { WorkingHours } from "@/lib/validations/admin";
import { HoldCountdownTimer } from "@/components/booking/hold-countdown-timer";
import { PageTransition } from "@/components/ui/page-transition";

interface DoctorData {
  id: string;
  userId: string;
  specialization: string;
  bio?: string | null;
  slotDurationMinutes: number;
  workingHours: WorkingHours;
  user: {
    name: string;
    email: string;
    phone?: string | null;
  };
}

export default function DoctorBookingPage() {
  const params = useParams();
  const router = useRouter();
  const doctorId = params.doctorId as string;

  const [doctor, setDoctor] = React.useState<DoctorData | null>(null);
  const [isLoadingDoctor, setIsLoadingDoctor] = React.useState(true);

  // Date selection (default: today if weekday, or next working day)
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const today = new Date();
    // Default to today in YYYY-MM-DD local format
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  // Slots State
  const [slots, setSlots] = React.useState<ComputedSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isOffDuty, setIsOffDuty] = React.useState(false);
  const [isOnLeave, setIsOnLeave] = React.useState(false);
  const [leaveReason, setLeaveReason] = React.useState<string | undefined>();

  // Active Hold State
  const [heldSlot, setHeldSlot] = React.useState<ComputedSlot | null>(null);
  const [holdTimerSeconds, setHoldTimerSeconds] = React.useState<number>(0);
  const [isHoldingSlot, setIsHoldingSlot] = React.useState(false);

  // Booking Form State
  const [symptomText, setSymptomText] = React.useState("");
  const [isConfirmingBooking, setIsConfirmingBooking] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

  // 1. Fetch Doctor Profile
  React.useEffect(() => {
    async function loadDoctor() {
      setIsLoadingDoctor(true);
      try {
        const res = await getDoctorForBookingAction(doctorId);
        if (!res.success || !res.data) {
          toast.error(res.error || "Specialist not found.");
          router.push("/patient/find-doctor");
        } else {
          setDoctor(res.data as unknown as DoctorData);
        }
      } catch (err) {
        toast.error("Failed to load specialist profile.");
      } finally {
        setIsLoadingDoctor(false);
      }
    }
    if (doctorId) loadDoctor();
  }, [doctorId, router]);

  // 2. Fetch Slots for Selected Date
  const fetchSlots = React.useCallback(async () => {
    if (!doctorId || !selectedDate) return;
    setIsLoadingSlots(true);
    try {
      const res = await getDoctorSlotsAction(doctorId, selectedDate);
      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to calculate slots.");
      } else {
        setSlots(res.data.slots);
        setIsOffDuty(res.data.isOffDuty);
        setIsOnLeave(res.data.isOnLeave);
        setLeaveReason(res.data.leaveReason);

        // Check if user has an active hold
        const activeHeld = res.data.slots.find((s) => s.status === "HELD_BY_YOU");
        if (activeHeld) {
          setHeldSlot(activeHeld);
          setHoldTimerSeconds(activeHeld.holdExpiresInSeconds || 300);
        } else if (heldSlot && !res.data.slots.some((s) => s.isoStartTime === heldSlot.isoStartTime && s.status === "HELD_BY_YOU")) {
          setHeldSlot(null);
          setHoldTimerSeconds(0);
        }
      }
    } catch (err) {
      toast.error("An error occurred while calculating availability.");
    } finally {
      setIsLoadingSlots(false);
    }
  }, [doctorId, selectedDate, heldSlot]);

  React.useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // 3. Live 5:00 Hold Countdown Timer
  React.useEffect(() => {
    if (holdTimerSeconds <= 0) {
      if (heldSlot) {
        setHeldSlot(null);
        toast.warning("Your 5-minute slot hold has expired. The slot has been returned to the pool.");
        fetchSlots();
      }
      return;
    }

    const interval = setInterval(() => {
      setHoldTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [holdTimerSeconds, heldSlot, fetchSlots]);

  // Format Timer mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 4. Handle Slot Selection / Hold
  const handleSelectSlot = async (slot: ComputedSlot) => {
    if (slot.status !== "AVAILABLE") return;

    setIsHoldingSlot(true);
    setBookingError(null);

    try {
      const res = await holdSlotAction({
        doctorId,
        isoStartTime: slot.isoStartTime,
      });

      if (!res.success) {
        toast.error(res.error || "Unable to hold slot. It may have just been claimed.");
        fetchSlots();
      } else {
        setHeldSlot(slot);
        setHoldTimerSeconds(res.data?.expiresInSeconds || 300);
        toast.success("Slot held for 5 minutes! Complete your details below to confirm.");
        fetchSlots();
      }
    } catch (err) {
      toast.error("Failed to place hold on slot.");
    } finally {
      setIsHoldingSlot(false);
    }
  };

  // 5. Handle Release Hold
  const handleReleaseHold = async () => {
    if (!heldSlot) return;

    try {
      await releaseSlotHoldAction({
        doctorId,
        isoStartTime: heldSlot.isoStartTime,
      });
      setHeldSlot(null);
      setHoldTimerSeconds(0);
      toast.info("Slot hold released.");
      fetchSlots();
    } catch (err) {
      console.error(err);
    }
  };

  // 6. Handle Confirm Booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heldSlot) {
      toast.error("No active slot hold found. Please select an available slot.");
      return;
    }

    if (!symptomText || symptomText.trim().length < 3) {
      toast.error("Please provide a brief description of your symptoms.");
      return;
    }

    setIsConfirmingBooking(true);
    setBookingError(null);

    try {
      const res = await confirmBookingAction({
        doctorId,
        isoStartTime: heldSlot.isoStartTime,
        symptomText: symptomText.trim(),
      });

      if (!res.success) {
        setBookingError(res.error || "Failed to confirm appointment.");
        toast.error(res.error || "Booking failed.");
        fetchSlots();
      } else if (res.data?.appointmentId) {
        toast.success("Appointment successfully confirmed!");
        router.push(`/patient/book/confirmation/${res.data.appointmentId}`);
      }
    } catch (err) {
      setBookingError("An unexpected error occurred. Please try again.");
    } finally {
      setIsConfirmingBooking(false);
    }
  };

  // Minimum allowed date (today)
  const minDateString = new Date().toISOString().split("T")[0];

  return (
    <PageTransition className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Back Button */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/patient/find-doctor">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Specialists Directory
          </Link>
        </Button>
      </div>

      {/* Doctor Header Card */}
      <Card className="border-primary/20 bg-card">
        <CardContent className="p-6">
          {isLoadingDoctor ? (
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full mt-2" />
            </div>
          ) : doctor ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">{doctor.user.name}</h1>
                    <Badge variant="outline" className="text-xs font-semibold text-primary">
                      {doctor.specialization}
                    </Badge>
                  </div>
                </div>
                {doctor.bio && (
                  <p className="text-xs text-muted-foreground pt-1 max-w-2xl leading-relaxed">
                    {doctor.bio}
                  </p>
                )}
              </div>

              <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 gap-1 text-xs text-muted-foreground">
                <span className="font-mono text-foreground font-semibold">
                  {doctor.slotDurationMinutes} min consultations
                </span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Accepting New Patients
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Booking Grid & Date Picker Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Date Selector */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              Select Date
            </CardTitle>
            <CardDescription className="text-xs">
              Choose a consultation date to view available time slots.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date-input" className="text-xs">Consultation Date</Label>
              <Input
                id="date-input"
                type="date"
                min={minDateString}
                className="font-mono text-sm"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (heldSlot) {
                    handleReleaseHold();
                  }
                }}
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Selected Day:</span>
              <p className="font-mono text-xs text-foreground">
                {selectedDate ? format(new Date(`${selectedDate}T00:00:00`), "EEEE, MMMM do, yyyy") : "None"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Computed Slot Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Available Slots
              </CardTitle>
              {heldSlot && (
                <HoldCountdownTimer
                  remainingSeconds={holdTimerSeconds}
                  totalSeconds={300}
                />
              )}
            </div>
            <CardDescription className="text-xs">
              Real-time slot availability. Selecting an available slot reserves it for 5 minutes.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoadingSlots ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 py-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : isOnLeave ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                <h3 className="font-bold text-sm text-foreground">Doctor On Leave</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {leaveReason ? `Reason: ${leaveReason}` : "The specialist is scheduled away on this date."} Please choose another date on the calendar.
                </p>
              </div>
            ) : isOffDuty ? (
              <div className="rounded-lg border border-dashed p-6 text-center space-y-2 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto opacity-50" />
                <h3 className="font-semibold text-sm text-foreground">Off Duty / Clinic Closed</h3>
                <p className="text-xs max-w-sm mx-auto">
                  The specialist does not have consultation hours configured for this weekday.
                </p>
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                No slots available for this date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {slots.map((slot) => {
                  const isHeldByMe = slot.status === "HELD_BY_YOU";
                  const isHeldByOther = slot.status === "HELD_BY_OTHER";
                  const isBooked = slot.status === "BOOKED";
                  const isPast = slot.status === "PAST";
                  const isAvailable = slot.status === "AVAILABLE";

                  let buttonVariant: "default" | "outline" | "secondary" = "outline";
                  let extraClasses = "border-primary/30 hover:border-primary hover:bg-primary/5 text-foreground";
                  let label = slot.displayTime;

                  if (isHeldByMe) {
                    buttonVariant = "default";
                    extraClasses = "bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2";
                  } else if (isHeldByOther) {
                    extraClasses = "opacity-60 bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 cursor-not-allowed text-[11px]";
                    label = `${slot.displayTime} (Held)`;
                  } else if (isBooked) {
                    extraClasses = "opacity-40 bg-muted border-dashed cursor-not-allowed line-through text-[11px]";
                    label = `${slot.displayTime} (Booked)`;
                  } else if (isPast) {
                    extraClasses = "opacity-30 bg-muted cursor-not-allowed text-[11px]";
                    label = `${slot.displayTime} (Past)`;
                  }

                  return (
                    <Button
                      key={slot.isoStartTime}
                      variant={buttonVariant}
                      className={`h-11 flex flex-col justify-center text-xs font-mono transition-all ${extraClasses}`}
                      disabled={!isAvailable && !isHeldByMe || isHoldingSlot}
                      onClick={() => handleSelectSlot(slot)}
                    >
                      <span>{label}</span>
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Symptom Intake & Confirmation Card (Visible when slot is held) */}
      {heldSlot && (
        <Card className="border-primary/50 shadow-md animate-in fade-in-50 slide-in-from-bottom-3 duration-200">
          <CardHeader className="bg-primary/5 pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Complete Consultation Details
                </CardTitle>
                <CardDescription className="text-xs">
                  Your selected slot is reserved for <span className="font-mono font-bold text-foreground">{formatTimer(holdTimerSeconds)}</span>.
                </CardDescription>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReleaseHold}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 self-start sm:self-auto"
              >
                <X className="h-3.5 w-3.5" />
                Release Slot
              </Button>
            </div>
          </CardHeader>

          <form onSubmit={handleConfirmBooking}>
            <CardContent className="space-y-4 pt-4">
              {bookingError && (
                <div className="rounded-lg bg-destructive/15 p-3 text-xs font-medium text-destructive border border-destructive/20 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div className="rounded-lg bg-muted/40 p-3 text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Specialist:</span>
                  <span className="font-semibold">{doctor?.user.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Consultation Date:</span>
                  <span className="font-mono font-semibold">
                    {format(new Date(heldSlot.isoStartTime), "EEE, MMM dd, yyyy")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Reserved Time Window:</span>
                  <span className="font-mono font-bold text-primary">
                    {heldSlot.displayTime} ({doctor?.slotDurationMinutes} mins)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="symptoms" className="text-xs font-semibold">
                  Symptoms &amp; Consultation Reason *
                </Label>
                <textarea
                  id="symptoms"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Please describe any primary symptoms, pain duration, existing medical conditions, or reasons for scheduling this appointment..."
                  value={symptomText}
                  onChange={(e) => setSymptomText(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Our AI clinical assistant synthesizes these notes to brief your doctor prior to the visit.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Protected with double-booking exclusion concurrency</span>
              </div>

              <Button type="submit" disabled={isConfirmingBooking || holdTimerSeconds <= 0} className="w-full sm:w-auto px-8">
                {isConfirmingBooking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Locking &amp; Confirming Booking...
                  </>
                ) : (
                  <>
                    Confirm &amp; Book Appointment
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </PageTransition>
  );
}

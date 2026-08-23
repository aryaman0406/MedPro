"use client";

import * as React from "react";
import { format, addDays, subDays } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Loader2,
  Stethoscope,
  User,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminReassignAppointmentAction,
  getDoctorsAction,
} from "@/app/actions/admin";
import { getDoctorSlotsAction } from "@/app/actions/booking";
import { ComputedSlot } from "@/lib/validations/booking";

export interface RescheduleAppointmentItem {
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
    id?: string; // DoctorProfile ID
    specialization: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
}

interface DoctorOption {
  id: string; // DoctorProfile ID
  specialization: string;
  user: {
    name: string;
    email: string;
  };
}

interface ReassignAppointmentDialogProps {
  appointment: RescheduleAppointmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReassignAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: ReassignAppointmentDialogProps) {
  const [reassignMode, setReassignMode] = React.useState<"SAME_DOCTOR" | "OTHER_DOCTOR">("SAME_DOCTOR");
  const [doctorsList, setDoctorsList] = React.useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>("");
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [availableSlots, setAvailableSlots] = React.useState<ComputedSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = React.useState<ComputedSlot | null>(null);
  const [isLoadingDoctors, setIsLoadingDoctors] = React.useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Derive original date, 1 day earlier, and 1 day after
  const origDate = React.useMemo(() => {
    if (!appointment) return new Date();
    return new Date(appointment.startTime);
  }, [appointment]);

  const dayEarlierDate = React.useMemo(() => subDays(origDate, 1), [origDate]);
  const dayLaterDate = React.useMemo(() => addDays(origDate, 1), [origDate]);

  const dayEarlierIso = React.useMemo(() => format(dayEarlierDate, "yyyy-MM-dd"), [dayEarlierDate]);
  const dayLaterIso = React.useMemo(() => format(dayLaterDate, "yyyy-MM-dd"), [dayLaterDate]);

  // Load doctors list when dialog opens
  React.useEffect(() => {
    if (open && appointment) {
      setErrorMsg(null);
      setSelectedSlot(null);
      setAvailableSlots([]);

      // Find original doctor profile ID
      const origDoctorId = appointment.doctor.id || "";
      setSelectedDoctorId(origDoctorId);
      setReassignMode("SAME_DOCTOR");
      setSelectedDate(dayEarlierIso);

      setIsLoadingDoctors(true);
      getDoctorsAction()
        .then((res) => {
          if (res.success && res.data) {
            setDoctorsList(res.data as unknown as DoctorOption[]);
            // If appointment.doctor.id is missing, try to find doctor matching doctor.user.name
            if (!origDoctorId) {
              const matched = (res.data as any[]).find(
                (d) => d.user.name === appointment.doctor.user.name || d.user.id === appointment.doctor.user.id
              );
              if (matched) {
                setSelectedDoctorId(matched.id);
              }
            }
          }
        })
        .finally(() => setIsLoadingDoctors(false));
    }
  }, [open, appointment, dayEarlierIso]);

  // Fetch slots whenever selectedDoctorId or selectedDate changes
  React.useEffect(() => {
    if (!open || !selectedDoctorId || !selectedDate) return;

    setIsLoadingSlots(true);
    setSelectedSlot(null);
    setErrorMsg(null);

    getDoctorSlotsAction(selectedDoctorId, selectedDate)
      .then((res) => {
        if (res.success && res.data) {
          if (res.data.isOnLeave) {
            setErrorMsg(`Doctor is on leave on ${selectedDate} (${res.data.leaveReason || "Scheduled Leave"}).`);
            setAvailableSlots([]);
          } else if (res.data.isOffDuty) {
            setErrorMsg(`Doctor does not have working hours configured on ${selectedDate}.`);
            setAvailableSlots([]);
          } else {
            setAvailableSlots(res.data.slots.filter((s) => s.status === "AVAILABLE"));
          }
        } else {
          setErrorMsg(res.error || "Failed to load available slots.");
          setAvailableSlots([]);
        }
      })
      .catch((err) => {
        setErrorMsg("Error loading slots.");
        setAvailableSlots([]);
      })
      .finally(() => setIsLoadingSlots(false));
  }, [open, selectedDoctorId, selectedDate]);

  if (!appointment) return null;

  const handleModeChange = (val: string) => {
    const mode = val as "SAME_DOCTOR" | "OTHER_DOCTOR";
    setReassignMode(mode);
    setSelectedSlot(null);
    setErrorMsg(null);

    if (mode === "SAME_DOCTOR") {
      const origDoc = doctorsList.find((d) => d.user.name === appointment.doctor.user.name) || doctorsList[0];
      if (origDoc) setSelectedDoctorId(origDoc.id);
      setSelectedDate(dayEarlierIso);
    } else {
      // Pick first alternative doctor if available
      const altDoc = doctorsList.find((d) => d.user.name !== appointment.doctor.user.name) || doctorsList[0];
      if (altDoc) setSelectedDoctorId(altDoc.id);
      setSelectedDate(format(origDate, "yyyy-MM-dd"));
    }
  };

  const handleConfirmReassign = async () => {
    if (!selectedDoctorId || !selectedSlot) {
      toast.error("Please select a target doctor and an available time slot.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await adminReassignAppointmentAction({
        appointmentId: appointment.id,
        targetDoctorId: selectedDoctorId,
        isoStartTime: selectedSlot.isoStartTime,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to reassign appointment.");
        toast.error(res.error || "Failed to reassign appointment.");
        return;
      }

      toast.success(res.message || "Appointment successfully reassigned!");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error("Error in handleConfirmReassign:", err);
      setErrorMsg((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Reassign / Reschedule Patient Consultation
          </DialogTitle>
          <DialogDescription className="text-xs">
            Resolve leave conflict for <span className="font-semibold text-foreground">{appointment.patient.name}</span> ({appointment.patient.email}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary Box */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-xs">
            <div className="flex justify-between font-semibold">
              <span>Original Booking Details:</span>
              <Badge variant="warning" className="text-[10px]">NEEDS_RESCHEDULE</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
              <div>
                Doctor: <span className="font-medium text-foreground">{appointment.doctor.user.name}</span>
              </div>
              <div>
                Specialization: <span className="font-medium text-foreground">{appointment.doctor.specialization}</span>
              </div>
              <div className="col-span-2">
                Original Time: <span className="font-medium font-mono text-foreground">{format(origDate, "PPP 'at' hh:mm a")}</span>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <Tabs value={reassignMode} onValueChange={handleModeChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="SAME_DOCTOR" className="text-xs">
                Same Doctor (±1 Day)
              </TabsTrigger>
              <TabsTrigger value="OTHER_DOCTOR" className="text-xs">
                Reassign to Other Specialist
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: SAME DOCTOR (1 day earlier or 1 day after) */}
            <TabsContent value="SAME_DOCTOR" className="space-y-3 pt-3">
              <p className="text-xs text-muted-foreground">
                Per clinic policy, rescheduling with <span className="font-semibold text-foreground">{appointment.doctor.user.name}</span> is restricted to <strong>1 day earlier</strong> or <strong>1 day after</strong> the original slot date.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedDate === dayEarlierIso ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col h-auto py-2 items-center text-xs"
                  onClick={() => setSelectedDate(dayEarlierIso)}
                >
                  <span className="text-[10px] font-semibold opacity-80">1 Day Earlier</span>
                  <span className="font-bold font-mono">{format(dayEarlierDate, "EEE, MMM dd")}</span>
                </Button>

                <Button
                  type="button"
                  variant={selectedDate === dayLaterIso ? "default" : "outline"}
                  size="sm"
                  className="flex flex-col h-auto py-2 items-center text-xs"
                  onClick={() => setSelectedDate(dayLaterIso)}
                >
                  <span className="text-[10px] font-semibold opacity-80">1 Day After</span>
                  <span className="font-bold font-mono">{format(dayLaterDate, "EEE, MMM dd")}</span>
                </Button>
              </div>
            </TabsContent>

            {/* TAB 2: OTHER DOCTOR */}
            <TabsContent value="OTHER_DOCTOR" className="space-y-3 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="target-doctor-select" className="text-xs font-semibold">Select Practitioner</Label>
                {isLoadingDoctors ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading doctors roster...
                  </div>
                ) : (
                  <select
                    id="target-doctor-select"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    {doctorsList.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.user.name} ({doc.specialization})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="target-date" className="text-xs font-semibold">Select Reschedule Date</Label>
                <Input
                  id="target-date"
                  type="date"
                  className="text-xs font-mono"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Error / Warning Alert */}
          {errorMsg && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Slots Picker Section */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Available Slots ({selectedDate})</span>
              {isLoadingSlots && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </Label>

            {isLoadingSlots ? (
              <div className="py-6 text-center text-xs text-muted-foreground border rounded-lg">
                Calculating available schedule slots...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                {errorMsg ? "No open slots available." : "No open slots found for this practitioner on the selected date."}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 border rounded-lg">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.isoStartTime === slot.isoStartTime;
                  return (
                    <Button
                      key={slot.isoStartTime}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="text-xs font-mono py-1.5 h-auto"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.displayTime}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!selectedSlot || isSubmitting}
            onClick={handleConfirmReassign}
            className="flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reassigning...
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                Confirm Reassignment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

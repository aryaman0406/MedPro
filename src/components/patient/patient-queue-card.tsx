"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  Megaphone,
  Radio,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPusherClient, LiveQueueState } from "@/lib/pusher";
import { patientCheckInAction } from "@/app/actions/queue";
import { AppointmentStatus } from "@prisma/client";

interface PatientQueueCardProps {
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  startTime: string | Date;
  status: AppointmentStatus;
  initialCheckedInAt?: string | Date | null;
}

export function PatientQueueCard({
  appointmentId,
  doctorId,
  doctorName,
  startTime,
  status: initialStatus,
  initialCheckedInAt,
}: PatientQueueCardProps) {
  const [checkedInAt, setCheckedInAt] = React.useState<string | null>(
    initialCheckedInAt ? new Date(initialCheckedInAt).toISOString() : null
  );
  const [status, setStatus] = React.useState<AppointmentStatus>(initialStatus);
  const [queuePosition, setQueuePosition] = React.useState<number | null>(null);
  const [isBeingCalled, setIsBeingCalled] = React.useState(
    initialStatus === "IN_PROGRESS"
  );
  const [isCheckingIn, setIsCheckingIn] = React.useState(false);
  const [isLiveConnected, setIsLiveConnected] = React.useState(false);

  const startTimeObj = new Date(startTime);
  const now = new Date();

  // Check if today is the day of appointment
  const isToday =
    now.getFullYear() === startTimeObj.getFullYear() &&
    now.getMonth() === startTimeObj.getMonth() &&
    now.getDate() === startTimeObj.getDate();

  // 30 min check-in window
  const thirtyMinBefore = new Date(startTimeObj.getTime() - 30 * 60 * 1000);
  const isCheckInOpen = isToday && now >= thirtyMinBefore;

  // Real-time Pusher Subscription once checked in
  React.useEffect(() => {
    if (!checkedInAt && status !== "IN_PROGRESS") return;

    const pusher = getPusherClient();
    if (pusher) {
      const channelName = `doctor-${doctorId}-queue`;
      const channel = pusher.subscribe(channelName);

      channel.bind("pusher:subscription_succeeded", () => {
        setIsLiveConnected(true);
      });

      channel.bind("queue-updated", (data: LiveQueueState) => {
        // 1. Check if patient is currently being called
        if (data.currentPatient?.appointmentId === appointmentId) {
          setIsBeingCalled(true);
          setStatus(AppointmentStatus.IN_PROGRESS);
          setQueuePosition(null);
          toast.info(`🔔 Dr. ${doctorName} is calling you now! Please proceed to the room.`);
          return;
        }

        // 2. Check position in waiting queue
        const myItem = data.waitingQueue.find((item) => item.appointmentId === appointmentId);
        if (myItem) {
          setQueuePosition(myItem.position);
          setIsBeingCalled(false);
          setStatus(AppointmentStatus.CONFIRMED);
        }
      });

      return () => {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
      };
    }
  }, [checkedInAt, appointmentId, doctorId, doctorName, status]);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const res = await patientCheckInAction(appointmentId);
      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to check in.");
      } else {
        toast.success("Checked in! You are now in the doctor's live waiting queue.");
        setCheckedInAt(new Date(res.data.checkedInAt).toISOString());
        setQueuePosition(res.data.queuePosition);
      }
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  // If appointment is already COMPLETED or CANCELLED, do not render check-in banner
  if (status === "COMPLETED" || status === "CANCELLED" || status === "NEEDS_RESCHEDULE") {
    return null;
  }

  return (
    <div className="rounded-xl border p-4 text-xs space-y-3 bg-card shadow-2xs">
      {/* 1. Being Called State */}
      {isBeingCalled ? (
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-500/15 p-4 space-y-2 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
            <span className="flex h-3 w-3 rounded-full bg-emerald-600 animate-ping shrink-0" />
            <Megaphone className="h-5 w-5" />
            <span>Doctor is Calling You Now!</span>
          </div>
          <p className="text-xs text-foreground font-semibold">
            Dr. {doctorName} is ready for you. Please proceed directly to Consultation Room.
          </p>
          <div className="pt-1 flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
              IN PROGRESS
            </Badge>
            {isLiveConnected && (
              <span className="text-[10px] text-muted-foreground font-mono">
                ● Live Real-Time Synchronized
              </span>
            )}
          </div>
        </div>
      ) : checkedInAt ? (
        /* 2. Checked In & In Queue State */
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>Checked In to Waiting Room</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>LIVE QUEUE</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border rounded-lg p-3">
            <div>
              <span className="text-[11px] text-muted-foreground block">
                Your Current Position
              </span>
              <div className="text-xl font-extrabold text-foreground flex items-baseline gap-1.5">
                {queuePosition !== null ? (
                  <>
                    <span className="text-primary">#{queuePosition}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      in queue
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-primary">In queue (Calculating...)</span>
                )}
              </div>
            </div>

            <div className="text-right text-[11px] text-muted-foreground">
              <span>Checked in at: </span>
              <strong className="text-foreground font-mono">
                {format(new Date(checkedInAt), "hh:mm a")}
              </strong>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Please stay in the clinic waiting area. Your position will update automatically in real-time as Dr. {doctorName} attends to patients.
          </p>
        </div>
      ) : isToday ? (
        /* 3. Today's Appointment - Pre Check-In State */
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>Consultation is Today</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isCheckInOpen
                ? "Check-in is now open! Click below to enter the doctor's live queue."
                : `Check-in opens 30 minutes before your slot (at ${format(thirtyMinBefore, "hh:mm a")}).`}
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleCheckIn}
            disabled={!isCheckInOpen || isCheckingIn}
            className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground font-semibold shrink-0"
          >
            {isCheckingIn ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Checking In...
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                Check In Now
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  Megaphone,
  RefreshCw,
  User,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UrgencyBadge } from "@/components/doctor/urgency-badge";
import { getPusherClient, LiveQueueItem, LiveQueueState } from "@/lib/pusher";
import { doctorCallNextPatientAction, getDoctorLiveQueueAction } from "@/app/actions/queue";

interface LiveQueuePanelProps {
  doctorId: string;
}

export function LiveQueuePanel({ doctorId }: LiveQueuePanelProps) {
  const [queueState, setQueueState] = React.useState<LiveQueueState | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCallingNext, setIsCallingNext] = React.useState(false);
  const [isLiveConnected, setIsLiveConnected] = React.useState(false);

  const fetchInitialQueue = React.useCallback(async () => {
    try {
      const res = await getDoctorLiveQueueAction(doctorId);
      if (res.success && res.data) {
        setQueueState(res.data);
      }
    } catch (err) {
      console.error("Error fetching live queue:", err);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  React.useEffect(() => {
    fetchInitialQueue();

    // Subscribe to Pusher live channel
    const pusher = getPusherClient();
    if (pusher) {
      const channelName = `doctor-${doctorId}-queue`;
      const channel = pusher.subscribe(channelName);

      channel.bind("pusher:subscription_succeeded", () => {
        setIsLiveConnected(true);
      });

      channel.bind("queue-updated", (data: LiveQueueState) => {
        setQueueState(data);
      });

      return () => {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
      };
    }
  }, [doctorId, fetchInitialQueue]);

  const handleCallNext = async () => {
    setIsCallingNext(true);
    try {
      const res = await doctorCallNextPatientAction(doctorId);
      if (!res.success) {
        toast.error(res.error || "Failed to call next patient.");
      } else {
        toast.success(res.message || "Calling patient to consultation room!");
        await fetchInitialQueue();
      }
    } catch (err) {
      toast.error((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsCallingNext(false);
    }
  };

  const waitingQueue = queueState?.waitingQueue || [];
  const currentPatient = queueState?.currentPatient;

  return (
    <Card className="border-primary/30 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 bg-primary/[0.02] border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Today&apos;s Live Queue</CardTitle>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isLiveConnected ? "LIVE PUSHER" : "ACTIVE QUEUE"}</span>
                </div>
              </div>
              <CardDescription className="text-xs">
                Patients ordered strictly by physical check-in time
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchInitialQueue}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={handleCallNext}
              disabled={isCallingNext || waitingQueue.length === 0}
              className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isCallingNext ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Calling...
                </>
              ) : (
                <>
                  <Megaphone className="h-3.5 w-3.5" />
                  Call Next Patient
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Currently Serving Patient Banner */}
        {currentPatient ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-sm">
                IN
              </div>
              <div>
                <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold mb-0.5">
                  Currently in Consultation Room
                </Badge>
                <h4 className="font-bold text-foreground text-sm">
                  {currentPatient.patientName}
                </h4>
                <p className="text-muted-foreground text-[11px] font-mono">
                  Scheduled slot: {format(new Date(currentPatient.startTime), "hh:mm a")}
                  {currentPatient.checkedInAt && ` • Checked in: ${format(new Date(currentPatient.checkedInAt), "hh:mm a")}`}
                </p>
              </div>
            </div>

            <Button size="sm" asChild className="text-xs h-8 gap-1 bg-emerald-700 hover:bg-emerald-800 text-white shrink-0">
              <Link href={`/doctor/appointments/${currentPatient.appointmentId}`}>
                Open Encounter Notes
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/20 p-3.5 text-center text-muted-foreground text-xs">
            No patient is currently in the consultation room. Click &quot;Call Next Patient&quot; when ready.
          </div>
        )}

        {/* Waiting Queue List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Waiting Room Queue ({waitingQueue.length})</span>
            <span>Check-In Timestamp</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary mb-1.5" />
              <span>Loading live queue...</span>
            </div>
          ) : waitingQueue.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">
              <User className="h-6 w-6 mx-auto mb-1 opacity-40" />
              <p className="font-semibold text-foreground">Waiting Room Clear</p>
              <p className="text-[11px] mt-0.5">
                No checked-in patients are currently waiting. Patients will appear here automatically upon checking in.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card overflow-hidden">
              {waitingQueue.map((item) => (
                <div
                  key={item.appointmentId}
                  className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      #{item.position}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">
                          {item.patientName}
                        </span>
                        {item.urgency && (
                          <UrgencyBadge urgency={item.urgency} status="COMPLETED" />
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11px] truncate max-w-sm">
                        &quot;{item.symptomText}&quot;
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-foreground text-xs block">
                      {item.checkedInAt ? format(new Date(item.checkedInAt), "hh:mm a") : "Just now"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Slot: {format(new Date(item.startTime), "hh:mm a")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

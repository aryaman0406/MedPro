import PusherServer from "pusher";
import PusherClient from "pusher-js";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus } from "@prisma/client";

// Global cache for Pusher client singleton in browser
let cachedPusherClient: PusherClient | null = null;

/**
 * Server-side Pusher Instance
 */
export function getPusherServer(): PusherServer | null {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";

  if (!appId || !key || !secret) {
    console.warn("⚠️ Pusher credentials (PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET) not fully configured.");
    return null;
  }

  return new PusherServer({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
}

/**
 * Client-side Pusher Instance
 */
export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";

  if (!key) {
    console.warn("⚠️ NEXT_PUBLIC_PUSHER_KEY not configured for client-side Pusher.");
    return null;
  }

  if (!cachedPusherClient) {
    cachedPusherClient = new PusherClient(key, {
      cluster,
    });
  }

  return cachedPusherClient;
}

export interface LiveQueueItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  checkedInAt: string;
  startTime: string;
  urgency?: "Low" | "Medium" | "High";
  symptomText: string;
  position: number;
}

export interface LiveQueueState {
  doctorId: string;
  timestamp: string;
  currentPatient: {
    appointmentId: string;
    patientId: string;
    patientName: string;
    startTime: string;
    checkedInAt?: string;
  } | null;
  waitingQueue: LiveQueueItem[];
  totalCheckedIn: number;
}

/**
 * Broadcast Real-Time Live Queue Update to Doctor & Patient Subscribers
 */
export async function broadcastQueueUpdate(doctorId: string): Promise<LiveQueueState | null> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch all checked-in, non-cancelled/non-completed appointments today
    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        checkedInAt: { not: null },
        status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        checkedInAt: "asc", // Order strictly by check-in time
      },
    });

    // Determine current in-progress consultation
    const inProgressAppt = appointments.find((a) => a.status === AppointmentStatus.IN_PROGRESS);

    // Waiting queue is remaining CONFIRMED checked-in patients
    const waitingAppts = appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED);

    const waitingQueue: LiveQueueItem[] = waitingAppts.map((appt, idx) => {
      const summary = appt.preVisitSummaryJson as { urgency?: "Low" | "Medium" | "High" } | null;
      return {
        appointmentId: appt.id,
        patientId: appt.patient.id,
        patientName: appt.patient.name,
        patientEmail: appt.patient.email,
        checkedInAt: appt.checkedInAt ? new Date(appt.checkedInAt).toISOString() : "",
        startTime: new Date(appt.startTime).toISOString(),
        urgency: summary?.urgency,
        symptomText: appt.symptomText,
        position: idx + 1,
      };
    });

    const queueState: LiveQueueState = {
      doctorId,
      timestamp: new Date().toISOString(),
      currentPatient: inProgressAppt
        ? {
            appointmentId: inProgressAppt.id,
            patientId: inProgressAppt.patient.id,
            patientName: inProgressAppt.patient.name,
            startTime: new Date(inProgressAppt.startTime).toISOString(),
            checkedInAt: inProgressAppt.checkedInAt ? new Date(inProgressAppt.checkedInAt).toISOString() : undefined,
          }
        : null,
      waitingQueue,
      totalCheckedIn: appointments.length,
    };

    // Trigger Pusher broadcast
    const pusher = getPusherServer();
    if (pusher) {
      const channelName = `doctor-${doctorId}-queue`;
      await pusher.trigger(channelName, "queue-updated", queueState);
      console.log(`[Pusher] Broadcasted queue-updated on channel [${channelName}] (${waitingQueue.length} waiting)`);
    }

    return queueState;
  } catch (error) {
    console.error("[Pusher] Error broadcasting queue update:", error);
    return null;
  }
}

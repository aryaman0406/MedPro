"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus, Role } from "@prisma/client";
import { broadcastQueueUpdate, LiveQueueState } from "@/lib/pusher";

export type QueueActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

/**
 * 1. Patient Check-In Action
 * Enabled on appointment day within 30 minutes of startTime
 */
export async function patientCheckInAction(
  appointmentId: string
): Promise<QueueActionResult<{ checkedInAt: Date; queuePosition: number; doctorId: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized. Please sign in to check in." };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, userId: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found." };
    }

    // Ensure user is the patient or admin
    if (appointment.patientId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { success: false, error: "Unauthorized to check in for this appointment." };
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED && appointment.status !== AppointmentStatus.IN_PROGRESS) {
      return { success: false, error: `Cannot check in. Appointment status is ${appointment.status}.` };
    }

    const now = new Date();
    const startTime = new Date(appointment.startTime);

    // Validate that today is the day of the appointment
    const isSameDay =
      now.getFullYear() === startTime.getFullYear() &&
      now.getMonth() === startTime.getMonth() &&
      now.getDate() === startTime.getDate();

    if (!isSameDay && session.user.role !== Role.ADMIN) {
      return {
        success: false,
        error: "Check-in is only available on the scheduled day of your appointment.",
      };
    }

    // Check-in window: within 30 minutes before startTime or anytime after startTime on appointment day
    const thirtyMinutesBefore = new Date(startTime.getTime() - 30 * 60 * 1000);
    if (now < thirtyMinutesBefore && session.user.role !== Role.ADMIN) {
      return {
        success: false,
        error: "Check-in opens 30 minutes before your scheduled start time.",
      };
    }

    const checkedInAt = appointment.checkedInAt || now;

    // Persist check-in timestamp
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { checkedInAt },
    });

    // Broadcast live update to doctor and waiting patients
    const queueState = await broadcastQueueUpdate(appointment.doctorId);

    // Determine patient position
    const position =
      queueState?.waitingQueue.find((item) => item.appointmentId === appointmentId)?.position || 1;

    revalidatePath("/patient/appointments");
    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");

    return {
      success: true,
      message: "Successfully checked in! Please wait in the clinic area.",
      data: {
        checkedInAt,
        queuePosition: position,
        doctorId: appointment.doctorId,
      },
    };
  } catch (error) {
    console.error("Error in patientCheckInAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to check in.",
    };
  }
}

/**
 * 2. Doctor "Call Next Patient" Action
 * Transitions next checked-in patient to IN_PROGRESS and broadcasts to Pusher
 */
export async function doctorCallNextPatientAction(
  doctorId: string
): Promise<QueueActionResult<{ activeAppointmentId: string; patientName: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized." };
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
    });

    if (!doctorProfile) {
      return { success: false, error: "Doctor profile not found." };
    }

    if (doctorProfile.userId !== session.user.id && session.user.role !== Role.ADMIN) {
      return { success: false, error: "Unauthorized." };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find next checked-in waiting patient
    const nextAppt = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: AppointmentStatus.CONFIRMED,
        checkedInAt: { not: null },
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        patient: { select: { name: true, email: true } },
      },
      orderBy: {
        checkedInAt: "asc", // FIFO based on check-in time
      },
    });

    if (!nextAppt) {
      return {
        success: false,
        error: "No checked-in patients currently waiting in queue.",
      };
    }

    // Set next patient to IN_PROGRESS
    await prisma.appointment.update({
      where: { id: nextAppt.id },
      data: { status: AppointmentStatus.IN_PROGRESS },
    });

    // Broadcast live update to all subscribers
    await broadcastQueueUpdate(doctorId);

    revalidatePath("/doctor/schedule");
    revalidatePath(`/doctor/appointments/${nextAppt.id}`);
    revalidatePath("/patient/appointments");

    return {
      success: true,
      message: `Calling patient ${nextAppt.patient.name} to consultation room.`,
      data: {
        activeAppointmentId: nextAppt.id,
        patientName: nextAppt.patient.name,
      },
    };
  } catch (error) {
    console.error("Error in doctorCallNextPatientAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to call next patient.",
    };
  }
}

/**
 * 3. Fetch Doctor Live Queue State (Initial Render)
 */
export async function getDoctorLiveQueueAction(
  doctorId: string
): Promise<QueueActionResult<LiveQueueState>> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

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
        patient: { select: { id: true, name: true, email: true } },
      },
      orderBy: {
        checkedInAt: "asc",
      },
    });

    const inProgressAppt = appointments.find((a) => a.status === AppointmentStatus.IN_PROGRESS);
    const waitingAppts = appointments.filter((a) => a.status === AppointmentStatus.CONFIRMED);

    const waitingQueue = waitingAppts.map((appt, idx) => {
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

    return {
      success: true,
      data: queueState,
    };
  } catch (error) {
    console.error("Error in getDoctorLiveQueueAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load live queue.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus, EmailStatus, EmailType } from "@prisma/client";
import { verifyRescheduleToken } from "@/lib/tokens";
import { processAppointmentPreVisitSummary } from "@/lib/gemini";
import { WorkingHours, DaySchedule } from "@/lib/validations/admin";

export type RescheduleActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

/**
 * 1. Retrieve Reschedule Details using Magic Link Token (No login required)
 */
export async function getRescheduleDetailsAction(token: string) {
  try {
    const payload = await verifyRescheduleToken(token);
    if (!payload) {
      return {
        success: false,
        error: "This magic reschedule link is invalid or has expired (7-day validity).",
      };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: payload.appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            leaves: {
              orderBy: { date: "asc" },
            },
          },
        },
      },
    });

    if (!appointment) {
      return {
        success: false,
        error: "Original appointment record not found.",
      };
    }

    return {
      success: true,
      data: {
        appointmentId: appointment.id,
        patientName: appointment.patient.name,
        patientEmail: appointment.patient.email,
        doctorId: appointment.doctorId,
        doctorName: appointment.doctor.user.name,
        specialization: appointment.doctor.specialization,
        originalStartTime: appointment.startTime,
        symptomText: appointment.symptomText,
        slotDurationMinutes: appointment.doctor.slotDurationMinutes,
        workingHours: appointment.doctor.workingHours as unknown as WorkingHours,
        doctorLeaves: appointment.doctor.leaves,
      },
    };
  } catch (error) {
    console.error("Error in getRescheduleDetailsAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load reschedule details.",
    };
  }
}

/**
 * 2. Execute Passwordless Reschedule using Magic Token
 */
export async function rescheduleAppointmentWithTokenAction({
  token,
  isoStartTime,
}: {
  token: string;
  isoStartTime: string;
}): Promise<RescheduleActionResult<{ newAppointmentId: string }>> {
  try {
    // 1. Verify Magic Token
    const payload = await verifyRescheduleToken(token);
    if (!payload) {
      return {
        success: false,
        error: "Reschedule link has expired or is invalid. Please request a new link or contact the clinic.",
      };
    }

    const { appointmentId, doctorId, patientId } = payload;
    const startTime = new Date(isoStartTime);

    // 2. Fetch original appointment and doctor profile
    const [oldAppointment, doctor] = await Promise.all([
      prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          patient: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          leaves: true,
        },
      }),
    ]);

    if (!oldAppointment) {
      return { success: false, error: "Original consultation record not found." };
    }

    if (oldAppointment.status !== AppointmentStatus.NEEDS_RESCHEDULE) {
      return {
        success: false,
        error: "This consultation has already been rescheduled or is no longer pending reschedule.",
      };
    }

    if (!doctor || !doctor.isActive) {
      return { success: false, error: "Doctor is currently not available for bookings." };
    }

    const slotDuration = doctor.slotDurationMinutes || 30;
    const endTime = new Date(startTime.getTime() + slotDuration * 60 * 1000);

    // 3. Atomically cancel old appointment & create new confirmed appointment
    const result = await prisma.$transaction(async (tx) => {
      // Check for slot collisions
      const overlap = await tx.appointment.findFirst({
        where: {
          doctorId,
          status: { notIn: [AppointmentStatus.CANCELLED] },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          NOT: { id: appointmentId }, // exclude self if applicable
        },
      });

      if (overlap) {
        throw new Error("CONFLICT_SLOT_TAKEN");
      }

      // Mark old appointment as CANCELLED
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.CANCELLED,
        },
      });

      // Create new CONFIRMED appointment
      const newAppt = await tx.appointment.create({
        data: {
          doctorId,
          patientId,
          startTime,
          endTime,
          status: AppointmentStatus.CONFIRMED,
          symptomText: oldAppointment.symptomText,
          preVisitSummaryStatus: "PENDING",
        },
      });

      // Queue BOOKING_CONFIRMATION EmailLog for Patient
      if (oldAppointment.patient.email) {
        await tx.emailLog.create({
          data: {
            appointmentId: newAppt.id,
            toEmail: oldAppointment.patient.email,
            type: EmailType.BOOKING_CONFIRMATION,
            status: EmailStatus.PENDING,
            attempts: 0,
          },
        });
      }

      // Queue BOOKING_CONFIRMATION EmailLog for Doctor
      if (doctor.user.email) {
        await tx.emailLog.create({
          data: {
            appointmentId: newAppt.id,
            toEmail: doctor.user.email,
            type: EmailType.BOOKING_CONFIRMATION,
            status: EmailStatus.PENDING,
            attempts: 0,
          },
        });
      }

      return newAppt;
    });

    // Trigger Pre-Visit AI intake analysis
    await processAppointmentPreVisitSummary(result.id, oldAppointment.symptomText);

    revalidatePath("/patient/appointments");
    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Consultation successfully rescheduled!",
      data: { newAppointmentId: result.id },
    };
  } catch (error: unknown) {
    const errorMsg = (error as Error)?.message || "";

    if (errorMsg.includes("CONFLICT_SLOT_TAKEN")) {
      return {
        success: false,
        error: "This slot was just booked by another patient. Please choose another available time.",
      };
    }

    console.error("Error in rescheduleAppointmentWithTokenAction:", error);
    return {
      success: false,
      error: errorMsg || "Failed to process appointment rescheduling.",
    };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { AppointmentStatus, Role, EmailType, EmailStatus } from "@prisma/client";
import { AddDoctorLeaveSchema, type AddDoctorLeaveInput } from "@/lib/validations/admin";
import {
  PreVisitSummaryData,
  CompleteVisitSchema,
  type CompleteVisitInput,
  type PostVisitSummaryData,
  type PrescriptionItem,
} from "@/lib/validations/ai";
import { createMedicationRemindersForAppointment } from "@/lib/reminders";
import { processAppointmentPostVisitSummary, processAppointmentPreVisitSummary } from "@/lib/gemini";

export type DoctorActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

// Helper: Ensure authenticated doctor
async function ensureDoctor() {
  const session = await auth();
  if (!session?.user || (session.user.role !== Role.DOCTOR && session.user.role !== Role.ADMIN)) {
    throw new Error("Unauthorized: Doctor access required.");
  }

  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!doctorProfile && session.user.role !== Role.ADMIN) {
    throw new Error("Doctor profile not found for this account.");
  }

  return { user: session.user, doctorProfile };
}

// 1. Get Doctor Schedule with Urgent-First Sorting for Today
export async function getDoctorScheduleAction(dateString?: string) {
  try {
    const { doctorProfile, user } = await ensureDoctor();

    const targetDoctorId = doctorProfile?.id || (
      await prisma.doctorProfile.findFirst()
    )?.id;

    if (!targetDoctorId) {
      return {
        success: false,
        error: "No doctor profile configured.",
      };
    }

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    let targetDate: Date;
    let isToday = false;

    if (dateString) {
      const [year, month, day] = dateString.split("-").map(Number);
      targetDate = new Date(year, month - 1, day);
      isToday =
        year === todayYear && month - 1 === todayMonth && day === todayDate;
    } else {
      targetDate = new Date(todayYear, todayMonth, todayDate);
      isToday = true;
    }

    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const dayEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: targetDoctorId,
        startTime: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const isHighUrgency = (appt: typeof appointments[0]) => {
      const summary = appt.preVisitSummaryJson as unknown as PreVisitSummaryData | null;
      return summary?.urgency === "High";
    };

    let sortedAppointments = [...appointments];
    if (isToday) {
      sortedAppointments.sort((a, b) => {
        const aHigh = isHighUrgency(a);
        const bHigh = isHighUrgency(b);
        if (aHigh && !bHigh) return -1;
        if (!aHigh && bHigh) return 1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
    }

    const highUrgencyCount = appointments.filter(isHighUrgency).length;
    const completedCount = appointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED
    ).length;

    return {
      success: true,
      data: {
        doctorName: doctorProfile?.user.name || "Doctor",
        specialization: doctorProfile?.specialization || "General Medicine",
        doctorId: targetDoctorId,
        dateString: targetDate.toISOString().split("T")[0],
        isToday,
        appointments: sortedAppointments,
        stats: {
          total: appointments.length,
          highUrgency: highUrgencyCount,
          completed: completedCount,
        },
      },
    };
  } catch (error) {
    console.error("Error in getDoctorScheduleAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load doctor schedule.",
    };
  }
}

// 2. Get Doctor Appointment Detail View
export async function getDoctorAppointmentDetailAction(appointmentId: string) {
  try {
    const { doctorProfile, user } = await ensureDoctor();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
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
          },
        },
        medicationReminders: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    if (!appointment) {
      return {
        success: false,
        error: "Appointment record not found.",
      };
    }

    if (user.role !== Role.ADMIN && doctorProfile && appointment.doctorId !== doctorProfile.id) {
      return {
        success: false,
        error: "You are not authorized to view this patient's consultation.",
      };
    }

    return {
      success: true,
      data: {
        ...appointment,
        preVisitSummary: appointment.preVisitSummaryJson as unknown as PreVisitSummaryData | null,
        postVisitSummary: appointment.postVisitSummaryJson as unknown as PostVisitSummaryData | null,
        prescription: appointment.prescriptionJson as unknown as PrescriptionItem[] | null,
      },
    };
  } catch (error) {
    console.error("Error in getDoctorAppointmentDetailAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to retrieve appointment details.",
    };
  }
}

// 3. Complete Visit (Save Notes, Prescriptions, Reminders, and Trigger Post-Visit AI)
export async function completeAppointmentVisitAction(
  input: CompleteVisitInput
): Promise<DoctorActionResult<{ appointmentId: string; reminderCount: number }>> {
  try {
    const { doctorProfile, user } = await ensureDoctor();

    const validated = CompleteVisitSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: "Validation failed for clinical notes and prescription details.",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { appointmentId, postVisitNotes, prescriptions, overrideTimeCheck } = validated.data;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found." };
    }

    if (user.role !== Role.ADMIN && doctorProfile && appointment.doctorId !== doctorProfile.id) {
      return { success: false, error: "Unauthorized to modify this consultation." };
    }

    const now = new Date();
    if (new Date(appointment.startTime) > now && !overrideTimeCheck) {
      return {
        success: false,
        error: "Consultation start time has not arrived yet. Please enable time override if completing ahead of time.",
      };
    }

    // Update appointment & insert medication reminders in transaction
    const reminderCount = await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.COMPLETED,
          postVisitNotes: postVisitNotes.trim(),
          prescriptionJson: prescriptions as unknown as object,
          postVisitSummaryStatus: "PENDING",
        },
      });

      return await createMedicationRemindersForAppointment(
        appointmentId,
        prescriptions,
        new Date(),
        tx
      );
    });

    // Trigger non-blocking post-visit AI summary synthesis
    void processAppointmentPostVisitSummary(appointmentId);

    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");
    revalidatePath(`/doctor/appointments/${appointmentId}`);
    revalidatePath("/patient/appointments");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Visit marked as completed! ${reminderCount} medication reminder(s) scheduled.`,
      data: { appointmentId, reminderCount },
    };
  } catch (error) {
    console.error("Error in completeAppointmentVisitAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to complete appointment visit.",
    };
  }
}

// 4. Manual Retry for Post-Visit AI Summary
export async function retryPostVisitSummaryAction(
  appointmentId: string
): Promise<DoctorActionResult<{ summary: PostVisitSummaryData }>> {
  try {
    const { doctorProfile, user } = await ensureDoctor();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found." };
    }

    if (user.role !== Role.ADMIN && doctorProfile && appointment.doctorId !== doctorProfile.id) {
      return { success: false, error: "Unauthorized." };
    }

    const result = await processAppointmentPostVisitSummary(appointmentId);

    revalidatePath(`/doctor/appointments/${appointmentId}`);
    revalidatePath("/patient/appointments");

    if (result.success && result.data) {
      return {
        success: true,
        message: "Post-visit patient brief successfully generated!",
        data: { summary: result.data },
      };
    } else {
      return {
        success: false,
        error: result.error || "AI summary generation failed. Please try again.",
      };
    }
  } catch (error) {
    console.error("Error in retryPostVisitSummaryAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to retry AI summary generation.",
    };
  }
}

// 5. Get Doctor Leaves
export async function getDoctorLeavesAction(targetDoctorId?: string) {
  try {
    const { doctorProfile, user } = await ensureDoctor();
    const docId = targetDoctorId || doctorProfile?.id;

    if (!docId) {
      return { success: false, error: "Doctor profile required." };
    }

    const leaves = await prisma.doctorLeave.findMany({
      where: { doctorId: docId },
      orderBy: { date: "asc" },
    });

    return {
      success: true,
      data: leaves,
    };
  } catch (error) {
    console.error("Error in getDoctorLeavesAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load doctor leaves.",
    };
  }
}

// 6. Request Doctor Leave
export async function requestDoctorLeaveAction(
  input: AddDoctorLeaveInput
): Promise<DoctorActionResult<{ leaveCount: number; rescheduledCount: number }>> {
  try {
    const { doctorProfile, user } = await ensureDoctor();

    const validated = AddDoctorLeaveSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: "Invalid leave details provided.",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const targetDoctorId = doctorProfile?.id || validated.data.doctorId;
    const { startDate, endDate, reason } = validated.data;

    const start = new Date(startDate);
    const end = endDate && endDate.trim().length > 0 ? new Date(endDate) : new Date(startDate);

    if (end < start) {
      return {
        success: false,
        error: "Leave end date cannot be earlier than start date.",
      };
    }

    const datesToInsert: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      datesToInsert.push(new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())));
      current.setDate(current.getDate() + 1);
    }

    const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    const result = await prisma.$transaction(async (tx) => {
      for (const d of datesToInsert) {
        await tx.doctorLeave.create({
          data: {
            doctorId: targetDoctorId,
            date: d,
            reason: reason?.trim() || "Leave registered by Doctor",
          },
        });
      }

      // 2. Find overlapping CONFIRMED appointments
      const affectedAppointments = await tx.appointment.findMany({
        where: {
          doctorId: targetDoctorId,
          status: AppointmentStatus.CONFIRMED,
          startTime: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        include: {
          patient: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      // 3. Cascade update overlapping CONFIRMED appointments to NEEDS_RESCHEDULE
      if (affectedAppointments.length > 0) {
        await tx.appointment.updateMany({
          where: {
            id: { in: affectedAppointments.map((a) => a.id) },
          },
          data: {
            status: AppointmentStatus.NEEDS_RESCHEDULE,
          },
        });

        // 4. Queue LEAVE_NOTICE EmailLogs for each patient
        for (const appt of affectedAppointments) {
          if (appt.patient.email) {
            await tx.emailLog.create({
              data: {
                appointmentId: appt.id,
                toEmail: appt.patient.email,
                type: EmailType.LEAVE_NOTICE,
                status: EmailStatus.PENDING,
                attempts: 0,
              },
            });
          }
        }
      }

      return {
        leaveCount: datesToInsert.length,
        rescheduledCount: affectedAppointments.length,
      };
    });

    revalidatePath("/doctor/leaves");
    revalidatePath("/doctor/leave");
    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");
    revalidatePath("/admin/doctors");
    revalidatePath("/admin");

    return {
      success: true,
      message:
        result.rescheduledCount > 0
          ? `Leave requested for ${result.leaveCount} day(s). ${result.rescheduledCount} conflicting appointment(s) flagged as Needs Reschedule.`
          : `Leave registered successfully for ${result.leaveCount} day(s).`,
      data: result,
    };
  } catch (error) {
    console.error("Error in requestDoctorLeaveAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to submit leave request.",
    };
  }
}

// 7. Delete Doctor Leave
export async function deleteDoctorLeaveAction(leaveId: string): Promise<DoctorActionResult> {
  try {
    const { doctorProfile, user } = await ensureDoctor();

    const leave = await prisma.doctorLeave.findUnique({
      where: { id: leaveId },
    });

    if (!leave) {
      return { success: false, error: "Leave record not found." };
    }

    if (user.role !== Role.ADMIN && doctorProfile && leave.doctorId !== doctorProfile.id) {
      return { success: false, error: "Unauthorized to remove this leave entry." };
    }

    await prisma.doctorLeave.delete({
      where: { id: leaveId },
    });

    revalidatePath("/doctor/leaves");
    revalidatePath("/doctor/leave");
    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");
    revalidatePath("/admin/doctors");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Leave entry removed successfully.",
    };
  } catch (error) {
    console.error("Error in deleteDoctorLeaveAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to remove leave entry.",
    };
  }
}

// 8. Manual "Mark No-Show" Action for un-checked-in past appointments
export async function markAppointmentNoShowAction(
  appointmentId: string
): Promise<DoctorActionResult<{ appointmentId: string }>> {
  try {
    const { doctorProfile, user } = await ensureDoctor();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { name: true } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found." };
    }

    if (user.role !== Role.ADMIN && doctorProfile && appointment.doctorId !== doctorProfile.id) {
      return { success: false, error: "Unauthorized to modify this consultation." };
    }

    // Update status to NO_SHOW
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.NO_SHOW,
      },
    });

    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");
    revalidatePath(`/doctor/appointments/${appointmentId}`);
    revalidatePath("/admin");
    revalidatePath("/patient/appointments");

    return {
      success: true,
      message: `Appointment for ${appointment.patient.name} marked as No-Show.`,
      data: { appointmentId },
    };
  } catch (error) {
    console.error("Error in markAppointmentNoShowAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to mark appointment as No-Show.",
    };
  }
}

// 9. Manual "Generate / Retry AI Pre-Visit Summary" Action
export async function retryPreVisitSummaryAction(
  appointmentId: string
): Promise<DoctorActionResult> {
  try {
    await ensureDoctor();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, symptomText: true },
    });

    if (!appointment || !appointment.symptomText) {
      return { success: false, error: "Appointment or symptom text not found." };
    }

    await processAppointmentPreVisitSummary(appointment.id, appointment.symptomText);

    revalidatePath(`/doctor/appointments/${appointmentId}`);
    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");

    return {
      success: true,
      message: "AI Pre-Visit Triage Summary generated successfully!",
    };
  } catch (error) {
    console.error("Error in retryPreVisitSummaryAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to generate AI pre-visit summary.",
    };
  }
}

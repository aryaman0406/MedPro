"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { AppointmentStatus, Role } from "@prisma/client";
import {
  CreateDoctorSchema,
  type CreateDoctorInput,
  UpdateDoctorSchema,
  type UpdateDoctorInput,
  AddDoctorLeaveSchema,
  type AddDoctorLeaveInput,
  WorkingHours,
} from "@/lib/validations/admin";

export type AdminActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

// Helper: Ensure authenticated admin
async function ensureAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Admin access required.");
  }
  return session.user;
}

// 1. Get Dashboard Summary Stats
export async function getAdminDashboardStatsAction() {
  try {
    await ensureAdmin();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [totalDoctors, totalPatients, appointmentsTodayCount, needsRescheduleAppointments] =
      await Promise.all([
        prisma.doctorProfile.count(),
        prisma.user.count({ where: { role: Role.PATIENT } }),
        prisma.appointment.count({
          where: {
            startTime: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),
        prisma.appointment.findMany({
          where: {
            status: AppointmentStatus.NEEDS_RESCHEDULE,
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
          },
          orderBy: {
            startTime: "asc",
          },
        }),
      ]);

    return {
      success: true,
      data: {
        totalDoctors,
        totalPatients,
        appointmentsTodayCount,
        needsRescheduleCount: needsRescheduleAppointments.length,
        needsRescheduleAppointments,
      },
    };
  } catch (error) {
    console.error("Error in getAdminDashboardStatsAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load dashboard metrics.",
    };
  }
}

// 2. Get All Doctors List
export async function getDoctorsAction() {
  try {
    await ensureAdmin();

    const now = new Date();
    const todayDateOnly = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const doctors = await prisma.doctorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        leaves: {
          orderBy: {
            date: "desc",
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const formattedDoctors = doctors.map((doc) => {
      // Check if on leave today
      const onLeaveToday = doc.leaves.some((leave) => {
        const leaveDate = new Date(leave.date);
        return (
          leaveDate.getUTCFullYear() === todayDateOnly.getUTCFullYear() &&
          leaveDate.getUTCMonth() === todayDateOnly.getUTCMonth() &&
          leaveDate.getUTCDate() === todayDateOnly.getUTCDate()
        );
      });

      return {
        ...doc,
        onLeaveToday,
        workingHours: doc.workingHours as unknown as WorkingHours,
      };
    });

    return {
      success: true,
      data: formattedDoctors,
    };
  } catch (error) {
    console.error("Error in getDoctorsAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load doctors list.",
    };
  }
}

// 3. Create Doctor (Transactional User + Profile)
export async function createDoctorAction(
  input: CreateDoctorInput
): Promise<AdminActionResult<{ doctorId: string; tempPassword: string }>> {
  try {
    await ensureAdmin();

    const validated = CreateDoctorSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: "Validation failed. Please review the highlighted form fields.",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { name, email, phone, tempPassword, specialization, bio, slotDurationMinutes, workingHours } =
      validated.data;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "A user account with this email address already exists.",
      };
    }

    const finalPassword =
      tempPassword && tempPassword.trim().length > 0
        ? tempPassword.trim()
        : `DocPass#${Math.floor(1000 + Math.random() * 9000)}!`;

    const passwordHash = await bcrypt.hash(finalPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: Role.DOCTOR,
          phone: phone?.trim() || null,
        },
      });

      const doctorProfile = await tx.doctorProfile.create({
        data: {
          userId: user.id,
          specialization,
          bio: bio?.trim() || null,
          slotDurationMinutes,
          workingHours: workingHours as unknown as object,
          isActive: true,
        },
      });

      return {
        doctorId: doctorProfile.id,
        tempPassword: finalPassword,
      };
    });

    revalidatePath("/admin/doctors");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Doctor ${name} successfully registered!`,
      data: result,
    };
  } catch (error) {
    console.error("Error in createDoctorAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to create doctor account.",
    };
  }
}

// 4. Update Doctor Profile & Schedule
export async function updateDoctorAction(
  input: UpdateDoctorInput
): Promise<AdminActionResult> {
  try {
    await ensureAdmin();

    const validated = UpdateDoctorSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: "Validation failed for doctor updates.",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { doctorId, specialization, bio, slotDurationMinutes, isActive, workingHours } =
      validated.data;

    await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        specialization,
        bio: bio?.trim() || null,
        slotDurationMinutes,
        isActive,
        workingHours: workingHours as unknown as object,
      },
    });

    revalidatePath("/admin/doctors");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Doctor profile and schedule updated successfully.",
    };
  } catch (error) {
    console.error("Error in updateDoctorAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to update doctor profile.",
    };
  }
}

// 5. Add Doctor Leave with Appointment Reschedule Cascade
export async function addDoctorLeaveAction(
  input: AddDoctorLeaveInput
): Promise<AdminActionResult<{ leaveCount: number; rescheduledCount: number }>> {
  try {
    await ensureAdmin();

    const validated = AddDoctorLeaveSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: "Invalid leave details provided.",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { doctorId, startDate, endDate, reason } = validated.data;

    const start = new Date(startDate);
    const end = endDate && endDate.trim().length > 0 ? new Date(endDate) : new Date(startDate);

    if (end < start) {
      return {
        success: false,
        error: "Leave end date cannot be earlier than start date.",
      };
    }

    // Generate dates in range
    const datesToInsert: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      datesToInsert.push(new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())));
      current.setDate(current.getDate() + 1);
    }

    // Start range for appointment checking
    const rangeStart = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
    const rangeEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Insert leave rows
      for (const d of datesToInsert) {
        await tx.doctorLeave.create({
          data: {
            doctorId,
            date: d,
            reason: reason?.trim() || "Leave registered by Clinic Admin",
          },
        });
      }

      // 2. Cascade update overlapping CONFIRMED appointments to NEEDS_RESCHEDULE
      const updateResult = await tx.appointment.updateMany({
        where: {
          doctorId,
          status: AppointmentStatus.CONFIRMED,
          startTime: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
        data: {
          status: AppointmentStatus.NEEDS_RESCHEDULE,
        },
      });

      return {
        leaveCount: datesToInsert.length,
        rescheduledCount: updateResult.count,
      };
    });

    revalidatePath("/admin/doctors");
    revalidatePath("/admin");

    return {
      success: true,
      message:
        result.rescheduledCount > 0
          ? `Leave registered for ${result.leaveCount} day(s). ${result.rescheduledCount} existing appointment(s) now need rescheduling.`
          : `Leave registered for ${result.leaveCount} day(s) with 0 overlapping appointments.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in addDoctorLeaveAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to register doctor leave.",
    };
  }
}

// 6. Delete Doctor Leave
export async function deleteDoctorLeaveAction(leaveId: string): Promise<AdminActionResult> {
  try {
    await ensureAdmin();

    await prisma.doctorLeave.delete({
      where: { id: leaveId },
    });

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
      error: (error as Error).message || "Failed to delete leave.",
    };
  }
}

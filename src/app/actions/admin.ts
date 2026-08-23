"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma, withDbRetry } from "@/lib/prisma";
import { auth } from "@/auth";
import { AppointmentStatus, Role, EmailType, EmailStatus } from "@prisma/client";
import { processEmailQueue } from "@/lib/email/mailer";
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
      await withDbRetry(() =>
        Promise.all([
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
        ])
      );

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

export interface DailyAppointmentStat {
  date: string;
  fullDate: string;
  total: number;
  completed: number;
  confirmed: number;
  noShow: number;
  cancelled: number;
}

export interface DoctorUtilizationStat {
  doctorId: string;
  doctorName: string;
  specialization: string;
  bookedSlots: number;
  availableSlots: number;
  utilizationRate: number;
}

export interface WeeklyNoShowStat {
  weekLabel: string;
  startDate: string;
  endDate: string;
  noShowRate: number;
  noShowCount: number;
  completedCount: number;
  totalFinished: number;
}

export interface AdminAnalyticsData {
  summary: {
    totalAppointments30d: number;
    completedAppointments30d: number;
    overallNoShowRate: number;
    averageDoctorUtilization: number;
    activeDoctorsCount: number;
  };
  dailyAppointments: DailyAppointmentStat[];
  doctorUtilization: DoctorUtilizationStat[];
  noShowTrend: WeeklyNoShowStat[];
}

// 1b. Comprehensive Practice Analytics View
export async function getAdminAnalyticsAction(): Promise<AdminActionResult<AdminAnalyticsData>> {
  try {
    await ensureAdmin();

    const now = new Date();

    // -------------------------------------------------------------
    // 1. Daily Volume over the last 30 days
    // -------------------------------------------------------------
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const appointments30d = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: thirtyDaysAgo,
          lte: endOfToday,
        },
      },
      select: {
        id: true,
        startTime: true,
        status: true,
      },
    });

    const dayBuckets: Record<string, DailyAppointmentStat> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const displayDate = `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;

      dayBuckets[isoDate] = {
        date: displayDate,
        fullDate: isoDate,
        total: 0,
        completed: 0,
        confirmed: 0,
        noShow: 0,
        cancelled: 0,
      };
    }

    appointments30d.forEach((appt) => {
      const apptDate = new Date(appt.startTime);
      const isoDate = `${apptDate.getFullYear()}-${String(apptDate.getMonth() + 1).padStart(2, "0")}-${String(apptDate.getDate()).padStart(2, "0")}`;
      if (dayBuckets[isoDate]) {
        dayBuckets[isoDate].total += 1;
        if (appt.status === AppointmentStatus.COMPLETED) dayBuckets[isoDate].completed += 1;
        else if (appt.status === AppointmentStatus.CONFIRMED || appt.status === AppointmentStatus.IN_PROGRESS)
          dayBuckets[isoDate].confirmed += 1;
        else if (appt.status === AppointmentStatus.NO_SHOW) dayBuckets[isoDate].noShow += 1;
        else if (appt.status === AppointmentStatus.CANCELLED || appt.status === AppointmentStatus.NEEDS_RESCHEDULE)
          dayBuckets[isoDate].cancelled += 1;
      }
    });

    const dailyAppointments = Object.values(dayBuckets);

    // -------------------------------------------------------------
    // 2. Doctor Weekly Utilization (Current Week)
    // -------------------------------------------------------------
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday...
    const diffToMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);

    const doctors = await prisma.doctorProfile.findMany({
      where: { isActive: true },
      include: {
        user: { select: { name: true } },
        leaves: {
          where: {
            date: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
          },
        },
        appointments: {
          where: {
            startTime: {
              gte: startOfWeek,
              lte: endOfWeek,
            },
            status: {
              in: [
                AppointmentStatus.CONFIRMED,
                AppointmentStatus.IN_PROGRESS,
                AppointmentStatus.COMPLETED,
                AppointmentStatus.NO_SHOW,
              ],
            },
          },
          select: { id: true },
        },
      },
    });

    const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

    const doctorUtilization: DoctorUtilizationStat[] = doctors.map((doc) => {
      const workingHours = doc.workingHours as unknown as Record<string, { enabled: boolean; start: string; end: string }> | null;
      const slotDuration = doc.slotDurationMinutes || 30;
      let totalAvailableSlots = 0;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + dayOffset);
        const dayName = dayKeys[currentDate.getDay()];

        // Check if doctor has a leave on this date
        const hasLeave = doc.leaves.some((leave) => {
          const lDate = new Date(leave.date);
          return (
            lDate.getFullYear() === currentDate.getFullYear() &&
            lDate.getMonth() === currentDate.getMonth() &&
            lDate.getDate() === currentDate.getDate()
          );
        });

        if (!hasLeave && workingHours && workingHours[dayName]?.enabled) {
          const sched = workingHours[dayName];
          const [startH, startM] = sched.start.split(":").map(Number);
          const [endH, endM] = sched.end.split(":").map(Number);
          const minutesTotal = endH * 60 + endM - (startH * 60 + startM);
          if (minutesTotal > 0) {
            totalAvailableSlots += Math.floor(minutesTotal / slotDuration);
          }
        }
      }

      const bookedSlots = doc.appointments.length;
      const effectiveAvailable = Math.max(totalAvailableSlots, 1);
      const utilizationRate = Math.min(100, Math.round((bookedSlots / effectiveAvailable) * 100));

      return {
        doctorId: doc.id,
        doctorName: doc.user.name,
        specialization: doc.specialization,
        bookedSlots,
        availableSlots: totalAvailableSlots,
        utilizationRate,
      };
    });

    // -------------------------------------------------------------
    // 3. No-Show Rate & 8-Week Historical Trend
    // -------------------------------------------------------------
    const eightWeeksAgo = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() - 7 * 7, 0, 0, 0, 0);

    const finishedAppointments8w = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: eightWeeksAgo,
          lte: endOfToday,
        },
        status: {
          in: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW],
        },
      },
      select: {
        startTime: true,
        status: true,
      },
    });

    const noShowTrend: WeeklyNoShowStat[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let w = 7; w >= 0; w--) {
      const wStart = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() - w * 7, 0, 0, 0, 0);
      const wEnd = new Date(wStart.getFullYear(), wStart.getMonth(), wStart.getDate() + 6, 23, 59, 59, 999);

      const weekFinished = finishedAppointments8w.filter((a) => {
        const t = new Date(a.startTime).getTime();
        return t >= wStart.getTime() && t <= wEnd.getTime();
      });

      const noShowCount = weekFinished.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
      const completedCount = weekFinished.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
      const totalFinished = noShowCount + completedCount;
      const noShowRate = totalFinished > 0 ? Math.round((noShowCount / totalFinished) * 100) : 0;

      const weekLabel = `${monthNames[wStart.getMonth()]} ${String(wStart.getDate()).padStart(2, "0")}`;

      noShowTrend.push({
        weekLabel,
        startDate: wStart.toISOString(),
        endDate: wEnd.toISOString(),
        noShowRate,
        noShowCount,
        completedCount,
        totalFinished,
      });
    }

    // -------------------------------------------------------------
    // 4. Overall Summary KPI Calculations
    // -------------------------------------------------------------
    const total30d = appointments30d.length;
    const completed30d = appointments30d.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
    const noShow30d = appointments30d.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
    const finished30d = completed30d + noShow30d;
    const overallNoShowRate = finished30d > 0 ? Math.round((noShow30d / finished30d) * 100) : 0;

    const avgDoctorUtilization =
      doctorUtilization.length > 0
        ? Math.round(doctorUtilization.reduce((sum, d) => sum + d.utilizationRate, 0) / doctorUtilization.length)
        : 0;

    return {
      success: true,
      data: {
        summary: {
          totalAppointments30d: total30d,
          completedAppointments30d: completed30d,
          overallNoShowRate,
          averageDoctorUtilization: avgDoctorUtilization,
          activeDoctorsCount: doctors.length,
        },
        dailyAppointments,
        doctorUtilization,
        noShowTrend,
      },
    };
  } catch (error) {
    console.error("Error in getAdminAnalyticsAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to calculate analytics metrics.",
    };
  }
}

// 2. Get All Doctors List
export async function getDoctorsAction() {
  try {
    await ensureAdmin();

    const now = new Date();
    const todayDateOnly = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const doctors = await withDbRetry(() =>
      prisma.doctorProfile.findMany({
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
      })
    );

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

      // 2. Find overlapping CONFIRMED appointments
      const affectedAppointments = await tx.appointment.findMany({
        where: {
          doctorId,
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

    revalidatePath("/admin/doctors");
    revalidatePath("/admin");

    return {
      success: true,
      message:
        result.rescheduledCount > 0
          ? `Leave registered for ${result.leaveCount} day(s). ${result.rescheduledCount} conflicting appointment(s) flagged as Needs Reschedule and notice emails queued.`
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

// 7. Get Email Delivery Dashboard Stats & Dead Queue
export async function getEmailDeliveryStatsAction() {
  try {
    await ensureAdmin();

    const [sentCount, pendingCount, failedCount, deadCount, deadEmails] = await Promise.all([
      prisma.emailLog.count({ where: { status: EmailStatus.SENT } }),
      prisma.emailLog.count({ where: { status: EmailStatus.PENDING } }),
      prisma.emailLog.count({ where: { status: EmailStatus.FAILED } }),
      prisma.emailLog.count({ where: { status: EmailStatus.DEAD } }),
      prisma.emailLog.findMany({
        where: {
          OR: [{ status: EmailStatus.DEAD }, { status: EmailStatus.FAILED }],
        },
        include: {
          appointment: {
            include: {
              patient: { select: { name: true, email: true } },
              doctor: { include: { user: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return {
      success: true,
      data: {
        stats: {
          sent: sentCount,
          pending: pendingCount,
          failed: failedCount,
          dead: deadCount,
          total: sentCount + pendingCount + failedCount + deadCount,
        },
        deadEmails,
      },
    };
  } catch (error) {
    console.error("Error in getEmailDeliveryStatsAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load email delivery metrics.",
    };
  }
}

// 8. Retry Dead / Failed Email
export async function retryDeadEmailAction(emailLogId: string): Promise<AdminActionResult> {
  try {
    await ensureAdmin();

    const email = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    });

    if (!email) {
      return { success: false, error: "Email log record not found." };
    }

    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status: EmailStatus.PENDING,
        attempts: 0,
        lastError: null,
      },
    });

    revalidatePath("/admin");

    return {
      success: true,
      message: `Email to ${email.toEmail} reset to PENDING and queued for delivery.`,
    };
  } catch (error) {
    console.error("Error in retryDeadEmailAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to reset email.",
    };
  }
}

// 9. Manual Trigger for Email Queue Processing
export async function triggerProcessEmailQueueAction(): Promise<AdminActionResult> {
  try {
    await ensureAdmin();

    const result = await processEmailQueue(50);
    revalidatePath("/admin");

    return {
      success: true,
      message: `Processed ${result.processed} email(s): ${result.sent} sent, ${result.failed} failed, ${result.dead} dead.`,
      data: result,
    };
  } catch (error) {
    console.error("Error in triggerProcessEmailQueueAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to process email queue.",
    };
  }
}

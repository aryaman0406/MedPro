"use server";

import { revalidatePath } from "next/cache";
import { prisma, withDbRetry } from "@/lib/prisma";
import { auth } from "@/auth";
import { AppointmentStatus, Role, EmailType, EmailStatus } from "@prisma/client";
import {
  GetSlotsQuerySchema,
  type GetSlotsQueryInput,
  HoldSlotSchema,
  type HoldSlotInput,
  ReleaseSlotHoldSchema,
  type ReleaseSlotHoldInput,
  ConfirmBookingSchema,
  type ConfirmBookingInput,
  type ComputedSlot,
} from "@/lib/validations/booking";
import {
  setSlotHold,
  getSlotHold,
  releaseSlotHold,
  deleteSlotHold,
  getAllDoctorHolds,
} from "@/lib/redis";
import { WorkingHours, DaySchedule } from "@/lib/validations/admin";
import { processAppointmentPreVisitSummary } from "@/lib/gemini";
import { processEmailQueue } from "@/lib/email/mailer";

export type BookingActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

// Helper: Ensure authenticated user
async function ensureAuthenticated() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Authentication required. Please sign in.");
  }
  return session.user;
}

// 1. Get Public Doctors for Directory
export async function getPublicDoctorsAction(searchQuery?: string, specializationFilter?: string) {
  try {
    const doctors = await withDbRetry(() =>
      prisma.doctorProfile.findMany({
        where: {
          isActive: true,
          ...(specializationFilter && specializationFilter !== "ALL"
            ? { specialization: specializationFilter }
            : {}),
          ...(searchQuery
            ? {
                OR: [
                  { user: { name: { contains: searchQuery, mode: "insensitive" } } },
                  { specialization: { contains: searchQuery, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          leaves: {
            orderBy: { date: "asc" },
          },
        },
        orderBy: {
          user: { name: "asc" },
        },
      })
    );

    return {
      success: true,
      data: doctors.map((doc: any) => ({
        ...doc,
        workingHours: doc.workingHours as unknown as WorkingHours,
      })),
    };
  } catch (error) {
    console.error("Error in getPublicDoctorsAction:", error);
    return {
      success: false,
      error: "Failed to load medical specialists directory.",
    };
  }
}

// 2. Get Doctor Details for Booking
export async function getDoctorForBookingAction(doctorId: string) {
  try {
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        leaves: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!doctor || !doctor.isActive) {
      return {
        success: false,
        error: "Specialist not found or currently unavailable for booking.",
      };
    }

    return {
      success: true,
      data: {
        ...doctor,
        workingHours: doctor.workingHours as unknown as WorkingHours,
      },
    };
  } catch (error) {
    console.error("Error in getDoctorForBookingAction:", error);
    return {
      success: false,
      error: "Failed to retrieve doctor details.",
    };
  }
}

// 3. Compute Real-time Available Slots
export async function getDoctorSlotsAction(
  doctorId: string,
  dateString: string
): Promise<BookingActionResult<{ slots: ComputedSlot[]; isOffDuty: boolean; isOnLeave: boolean; leaveReason?: string }>> {
  try {
    const validated = GetSlotsQuerySchema.safeParse({ doctorId, date: dateString });
    if (!validated.success) {
      return {
        success: false,
        error: "Invalid doctor or date parameter.",
      };
    }

    const session = await auth();
    const currentUserId = session?.user?.id;

    // 1. Fetch doctor profile
    const doctor = await withDbRetry(() =>
      prisma.doctorProfile.findUnique({
        where: { id: doctorId },
        include: {
          leaves: true,
        },
      })
    );

    if (!doctor || !doctor.isActive) {
      return {
        success: false,
        error: "Doctor is inactive or not found.",
      };
    }

    const [year, month, day] = dateString.split("-").map(Number);
    const targetDateUtc = new Date(Date.UTC(year, month - 1, day));
    const targetDateLocal = new Date(year, month - 1, day);

    // 2. Check if doctor is on leave
    const leaveForDate = doctor.leaves.find((leave) => {
      const lDate = new Date(leave.date);
      return (
        lDate.getUTCFullYear() === targetDateUtc.getUTCFullYear() &&
        lDate.getUTCMonth() === targetDateUtc.getUTCMonth() &&
        lDate.getUTCDate() === targetDateUtc.getUTCDate()
      );
    });

    if (leaveForDate) {
      return {
        success: true,
        data: {
          slots: [],
          isOffDuty: false,
          isOnLeave: true,
          leaveReason: leaveForDate.reason || "Scheduled Leave",
        },
      };
    }

    // 3. Check weekday operating hours
    const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
    const weekdayKey = weekdayNames[targetDateLocal.getDay()];
    const workingHoursObj = doctor.workingHours as unknown as WorkingHours;
    const daySchedule: DaySchedule | undefined = workingHoursObj?.[weekdayKey];

    if (!daySchedule || !daySchedule.isWorking || !daySchedule.start || !daySchedule.end) {
      return {
        success: true,
        data: {
          slots: [],
          isOffDuty: true,
          isOnLeave: false,
        },
      };
    }

    // 4. Parse working window start/end times
    const [startHour, startMin] = daySchedule.start.split(":").map(Number);
    const [endHour, endMin] = daySchedule.end.split(":").map(Number);

    const slotDuration = doctor.slotDurationMinutes || 30;

    const dayStartDateTime = new Date(year, month - 1, day, startHour, startMin, 0, 0);
    const dayEndDateTime = new Date(year, month - 1, day, endHour, endMin, 0, 0);

    // 5. Fetch existing appointments for the day
    const existingAppointments = await withDbRetry(() =>
      prisma.appointment.findMany({
        where: {
          doctorId,
          status: {
            notIn: [AppointmentStatus.CANCELLED],
          },
          startTime: {
            gte: new Date(year, month - 1, day, 0, 0, 0, 0),
            lte: new Date(year, month - 1, day, 23, 59, 59, 999),
          },
        },
        select: {
          startTime: true,
          endTime: true,
          status: true,
        },
      })
    );

    // 6. Fetch active Redis holds for doctor
    const activeHolds = await getAllDoctorHolds(doctorId);

    // 7. Generate slots
    const now = new Date();
    const slots: ComputedSlot[] = [];
    let currentSlotStart = new Date(dayStartDateTime);

    while (currentSlotStart.getTime() + slotDuration * 60 * 1000 <= dayEndDateTime.getTime()) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDuration * 60 * 1000);
      const isoStart = currentSlotStart.toISOString();
      const isoEnd = currentSlotEnd.toISOString();

      // Format human-readable time (e.g. 09:00 AM)
      const hours12 = currentSlotStart.getHours() % 12 || 12;
      const minutesStr = currentSlotStart.getMinutes().toString().padStart(2, "0");
      const ampm = currentSlotStart.getHours() >= 12 ? "PM" : "AM";
      const displayTime = `${hours12}:${minutesStr} ${ampm}`;

      // Check if in past
      if (currentSlotStart <= now) {
        slots.push({
          isoStartTime: isoStart,
          isoEndTime: isoEnd,
          displayTime,
          status: "PAST",
        });
      } else {
        // Check if overlaps confirmed appointment
        const isBooked = existingAppointments.some((appt) => {
          const apptStart = new Date(appt.startTime).getTime();
          const apptEnd = new Date(appt.endTime).getTime();
          const slotStartMs = currentSlotStart.getTime();
          const slotEndMs = currentSlotEnd.getTime();
          return slotStartMs < apptEnd && slotEndMs > apptStart;
        });

        if (isBooked) {
          slots.push({
            isoStartTime: isoStart,
            isoEndTime: isoEnd,
            displayTime,
            status: "BOOKED",
          });
        } else {
          // Check Redis hold
          const hold = activeHolds.get(isoStart);
          if (hold) {
            if (currentUserId && hold.userId === currentUserId) {
              slots.push({
                isoStartTime: isoStart,
                isoEndTime: isoEnd,
                displayTime,
                status: "HELD_BY_YOU",
                holdExpiresInSeconds: hold.expiresInSeconds,
              });
            } else {
              slots.push({
                isoStartTime: isoStart,
                isoEndTime: isoEnd,
                displayTime,
                status: "HELD_BY_OTHER",
              });
            }
          } else {
            slots.push({
              isoStartTime: isoStart,
              isoEndTime: isoEnd,
              displayTime,
              status: "AVAILABLE",
            });
          }
        }
      }

      currentSlotStart = new Date(currentSlotStart.getTime() + slotDuration * 60 * 1000);
    }

    return {
      success: true,
      data: {
        slots,
        isOffDuty: false,
        isOnLeave: false,
      },
    };
  } catch (error) {
    console.error("Error in getDoctorSlotsAction:", error);
    return {
      success: false,
      error: "Failed to calculate appointment slots.",
    };
  }
}

// 4. Place Short-lived Slot Hold (Atomic Redis SET NX EX)
export async function holdSlotAction(
  input: HoldSlotInput
): Promise<BookingActionResult<{ expiresInSeconds: number }>> {
  try {
    const user = await ensureAuthenticated();

    const validated = HoldSlotSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: "Invalid slot selection format.",
      };
    }

    const { doctorId, isoStartTime } = validated.data;
    const startTime = new Date(isoStartTime);

    // Verify doctor exists
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
    });

    if (!doctor || !doctor.isActive) {
      return {
        success: false,
        error: "Specialist is currently not accepting new bookings.",
      };
    }

    const slotDuration = doctor.slotDurationMinutes || 30;
    const endTime = new Date(startTime.getTime() + slotDuration * 60 * 1000);

    // Check DB for existing confirmed appointment
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { notIn: [AppointmentStatus.CANCELLED] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    if (existing) {
      return {
        success: false,
        error: "This slot is already booked. Please choose another available time.",
      };
    }

    // Place atomic Redis hold for 300 seconds (5 minutes)
    const acquired = await setSlotHold(doctorId, isoStartTime, user.id, 300);

    if (!acquired) {
      // Check if user already holds it
      const currentHold = await getSlotHold(doctorId, isoStartTime);
      if (currentHold && currentHold.userId === user.id) {
        return {
          success: true,
          message: "You already have an active hold on this slot.",
          data: { expiresInSeconds: currentHold.expiresInSeconds },
        };
      }

      return {
        success: false,
        error: "This slot is currently held by another patient. Please select another slot.",
      };
    }

    return {
      success: true,
      message: "Slot held for 5 minutes. Please complete your symptom details to confirm.",
      data: { expiresInSeconds: 300 },
    };
  } catch (error) {
    console.error("Error in holdSlotAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to place slot hold.",
    };
  }
}

// 5. Release Slot Hold Manually
export async function releaseSlotHoldAction(
  input: ReleaseSlotHoldInput
): Promise<BookingActionResult> {
  try {
    const user = await ensureAuthenticated();
    const validated = ReleaseSlotHoldSchema.safeParse(input);
    if (!validated.success) {
      return { success: false, error: "Invalid slot parameter." };
    }

    await releaseSlotHold(validated.data.doctorId, validated.data.isoStartTime, user.id);

    return {
      success: true,
      message: "Slot hold released.",
    };
  } catch (error) {
    console.error("Error in releaseSlotHoldAction:", error);
    return {
      success: false,
      error: "Failed to release hold.",
    };
  }
}

// 6. Confirm Booking (Double-Booking Prevention with Postgres Exclusion Constraint)
export async function confirmBookingAction(
  input: ConfirmBookingInput
): Promise<BookingActionResult<{ appointmentId: string }>> {
  try {
    const user = await ensureAuthenticated();

    const validated = ConfirmBookingSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: "Please complete all required booking fields.",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { doctorId, isoStartTime, symptomText } = validated.data;
    const startTime = new Date(isoStartTime);

    // 1. Verify Redis Hold belongs to this user and is unexpired
    const activeHold = await getSlotHold(doctorId, isoStartTime);
    if (!activeHold || activeHold.userId !== user.id) {
      return {
        success: false,
        error: "Your 5-minute hold for this slot has expired. Please select the slot again to book.",
      };
    }

    // 2. Fetch Doctor Profile to determine slot end time
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!doctor || !doctor.isActive) {
      return {
        success: false,
        error: "The requested medical practitioner is currently not available.",
      };
    }

    const slotDuration = doctor.slotDurationMinutes || 30;
    const endTime = new Date(startTime.getTime() + slotDuration * 60 * 1000);

    // 3. Attempt Insert inside Prisma Transaction protected by PostgreSQL GiST constraint
    try {
      const appointment = await prisma.$transaction(async (tx) => {
        // Pre-check for overlapping active appointments
        const overlap = await tx.appointment.findFirst({
          where: {
            doctorId,
            status: { notIn: [AppointmentStatus.CANCELLED] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (overlap) {
          throw new Error("CONFLICT_SLOT_TAKEN");
        }

        const newAppt = await tx.appointment.create({
          data: {
            doctorId,
            patientId: user.id,
            startTime,
            endTime,
            status: AppointmentStatus.CONFIRMED,
            symptomText: symptomText.trim(),
            symptomImage: validated.data.symptomImage || null,
            preVisitSummaryStatus: "PENDING",
          },
        });

        // 3a. Queue BOOKING_CONFIRMATION EmailLog for Patient
        const patientRecord = await tx.user.findUnique({
          where: { id: user.id },
          select: { email: true },
        });
        const targetPatientEmail = patientRecord?.email || user.email;

        if (targetPatientEmail) {
          await tx.emailLog.create({
            data: {
              appointmentId: newAppt.id,
              toEmail: targetPatientEmail,
              type: EmailType.BOOKING_CONFIRMATION,
              status: EmailStatus.PENDING,
              attempts: 0,
            },
          });
        }

        // 3b. Queue BOOKING_CONFIRMATION EmailLog for Doctor
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

      // 4. Success: Clear Redis hold
      await deleteSlotHold(doctorId, isoStartTime);

      // 5. Trigger Pre-Visit AI Intake summary generation asynchronously in background
      void processAppointmentPreVisitSummary(appointment.id, symptomText.trim()).catch((aiErr) => {
        console.error("Background AI summary generation notice:", aiErr);
      });

      // 6. Automatically dispatch queued confirmation emails immediately with zero manual admin action
      void processEmailQueue(10).catch((emailErr) => {
        console.error("Background email queue processing notice:", emailErr);
      });

      revalidatePath("/patient/appointments");
      revalidatePath("/admin");
      revalidatePath("/doctor");
      revalidatePath("/doctor/schedule");

      return {
        success: true,
        message: "Your appointment has been successfully confirmed!",
        data: { appointmentId: appointment.id },
      };
    } catch (insertError: unknown) {
      const errorMsg = (insertError as Error)?.message || "";
      const prismaCode = (insertError as { code?: string })?.code;

      // Detect PostgreSQL GiST exclusion constraint violation (code 23P01 / P2002 / P2010)
      const isExclusionConflict =
        errorMsg.includes("CONFLICT_SLOT_TAKEN") ||
        errorMsg.includes("23P01") ||
        errorMsg.includes("appointments_prevent_overlap") ||
        errorMsg.includes("exclusion constraint") ||
        prismaCode === "P2002" ||
        prismaCode === "P2010";

      if (isExclusionConflict) {
        // Remove stale hold
        await deleteSlotHold(doctorId, isoStartTime);

        return {
          success: false,
          error: "Sorry, this slot was just booked by someone else. Please choose another available time.",
        };
      }

      console.error("Unhandled booking insert error:", insertError);
      return {
        success: false,
        error: "Unable to process appointment booking. Please try again.",
      };
    }
  } catch (error) {
    console.error("Error in confirmBookingAction:", error);
    return {
      success: false,
      error: (error as Error).message || "An unexpected error occurred while confirming booking.",
    };
  }
}

// 7. Get Patient Appointments (Upcoming & Past)
export async function getPatientAppointmentsAction() {
  try {
    const user = await ensureAuthenticated();

    const now = new Date();

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: user.id,
      },
      include: {
        doctor: {
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
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const upcoming = appointments.filter(
      (a) => new Date(a.startTime) >= now && a.status !== AppointmentStatus.CANCELLED
    );

    const past = appointments.filter(
      (a) => new Date(a.startTime) < now || a.status === AppointmentStatus.CANCELLED
    );

    return {
      success: true,
      data: {
        upcoming,
        past,
      },
    };
  } catch (error) {
    console.error("Error in getPatientAppointmentsAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to load patient appointments.",
    };
  }
}

// 8. Cancel Appointment & Queue Cancellation EmailLogs
export async function cancelAppointmentAction(
  appointmentId: string,
  reason?: string
): Promise<BookingActionResult> {
  try {
    const user = await ensureAuthenticated();

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { id: true, email: true, name: true } },
        doctor: { include: { user: { select: { id: true, email: true, name: true } } } },
      },
    });

    if (!appointment) {
      return { success: false, error: "Appointment not found." };
    }

    // Ensure authorized (Patient, Doctor, or Admin)
    const isOwnerPatient = appointment.patientId === user.id;
    const isOwnerDoctor = appointment.doctor.user.id === user.id;
    const isAdmin = user.role === Role.ADMIN;

    if (!isOwnerPatient && !isOwnerDoctor && !isAdmin) {
      return { success: false, error: "Unauthorized to cancel this appointment." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update appointment status
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.CANCELLED },
      });

      // 2. Queue CANCELLATION EmailLog for Patient
      if (appointment.patient.email) {
        await tx.emailLog.create({
          data: {
            appointmentId: appointment.id,
            toEmail: appointment.patient.email,
            type: EmailType.CANCELLATION,
            status: EmailStatus.PENDING,
            attempts: 0,
          },
        });
      }

      // 3. Queue CANCELLATION EmailLog for Doctor
      if (appointment.doctor.user.email) {
        await tx.emailLog.create({
          data: {
            appointmentId: appointment.id,
            toEmail: appointment.doctor.user.email,
            type: EmailType.CANCELLATION,
            status: EmailStatus.PENDING,
            attempts: 0,
          },
        });
      }
    });

    // 4. Automatically dispatch cancellation emails immediately with zero manual admin action
    void processEmailQueue(10).catch((emailErr) => {
      console.error("Background cancellation email queue processing notice:", emailErr);
    });

    revalidatePath("/patient/appointments");
    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");
    revalidatePath("/admin");

    return {
      success: true,
      message: "Consultation successfully cancelled.",
    };
  } catch (error) {
    console.error("Error in cancelAppointmentAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to cancel appointment.",
    };
  }
}

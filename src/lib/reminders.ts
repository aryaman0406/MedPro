import { prisma } from "@/lib/prisma";
import { PrescriptionItem } from "@/lib/validations/ai";
import { Prisma } from "@prisma/client";

/**
 * Standard daily slot schedules (in 24-hour format) for various daily frequencies
 */
function getDailyHourSlots(frequencyPerDay: number): number[] {
  switch (frequencyPerDay) {
    case 1:
      return [9]; // 09:00 AM
    case 2:
      return [9, 21]; // 09:00 AM, 09:00 PM (12 hours apart)
    case 3:
      return [8, 14, 20]; // 08:00 AM, 02:00 PM, 08:00 PM (6-8 hours apart)
    case 4:
      return [8, 12, 16, 20]; // 08:00 AM, 12:00 PM, 04:00 PM, 08:00 PM
    default: {
      const slots: number[] = [];
      const interval = Math.floor(14 / Math.max(1, frequencyPerDay - 1));
      for (let i = 0; i < frequencyPerDay; i++) {
        slots.push(8 + i * interval);
      }
      return slots;
    }
  }
}

export interface ComputedMedicationReminder {
  medicineName: string;
  dosage?: string | null;
  instructions?: string | null;
  scheduledFor: Date;
}

/**
 * Compute concrete reminder timestamps for each medication row
 */
export function computeMedicationReminderTimestamps(
  prescriptions: PrescriptionItem[],
  baseDate: Date = new Date()
): ComputedMedicationReminder[] {
  const reminders: ComputedMedicationReminder[] = [];

  const startYear = baseDate.getFullYear();
  const startMonth = baseDate.getMonth();
  const startDate = baseDate.getDate();

  for (const rx of prescriptions) {
    const { medicineName, dosage, frequencyPerDay, durationDays, instructions } = rx;
    const hourSlots = getDailyHourSlots(frequencyPerDay);

    for (let dayOffset = 0; dayOffset < durationDays; dayOffset++) {
      for (const hour of hourSlots) {
        const scheduledTime = new Date(startYear, startMonth, startDate + dayOffset, hour, 0, 0, 0);

        reminders.push({
          medicineName,
          dosage: dosage || null,
          instructions: instructions || null,
          scheduledFor: scheduledTime,
        });
      }
    }
  }

  return reminders;
}

/**
 * Insert medication reminders into database for an appointment
 */
export async function createMedicationRemindersForAppointment(
  appointmentId: string,
  prescriptions: PrescriptionItem[],
  baseDate: Date = new Date(),
  tx?: Prisma.TransactionClient
): Promise<number> {
  if (!prescriptions || prescriptions.length === 0) {
    return 0;
  }

  const client = tx || prisma;
  const remindersToCreate = computeMedicationReminderTimestamps(prescriptions, baseDate);

  // Clear existing pending reminders if updating/re-completing
  await client.medicationReminder.deleteMany({
    where: {
      appointmentId,
      status: "PENDING",
    },
  });

  if (remindersToCreate.length === 0) {
    return 0;
  }

  const created = await client.medicationReminder.createMany({
    data: remindersToCreate.map((r) => ({
      appointmentId,
      medicineName: r.medicineName,
      dosage: r.dosage,
      instructions: r.instructions,
      scheduledFor: r.scheduledFor,
      status: "PENDING",
    })),
  });

  return created.count;
}

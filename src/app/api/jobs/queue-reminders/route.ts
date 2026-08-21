import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus, EmailType, EmailStatus } from "@prisma/client";

/**
 * Queue 24-Hour Upcoming Consultation Reminders
 */
export async function POST(req: NextRequest) {
  try {
    const now = new Date();
    // Look ahead 23 hours to 25 hours from now
    const rangeStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const rangeEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Find confirmed appointments in window
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
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
        emailLogs: {
          where: {
            type: EmailType.REMINDER,
          },
        },
      },
    });

    const queuedList: Array<{ appointmentId: string; patientEmail: string }> = [];

    await prisma.$transaction(async (tx) => {
      for (const appt of upcomingAppointments) {
        // Skip if reminder already queued or sent
        if (appt.emailLogs.length > 0) continue;

        if (appt.patient.email) {
          await tx.emailLog.create({
            data: {
              appointmentId: appt.id,
              toEmail: appt.patient.email,
              type: EmailType.REMINDER,
              status: EmailStatus.PENDING,
              attempts: 0,
            },
          });

          queuedList.push({
            appointmentId: appt.id,
            patientEmail: appt.patient.email,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Queued ${queuedList.length} 24-hour reminder email(s).`,
      data: {
        queuedCount: queuedList.length,
        reminders: queuedList,
      },
    });
  } catch (error) {
    console.error("[Queue Reminders Job] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}

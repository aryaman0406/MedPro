import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { prisma } from "@/lib/prisma";
import { EmailType, EmailStatus, ReminderStatus } from "@prisma/client";

// Initialize QStash Receiver if keys are configured
const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

const qstashReceiver =
  currentSigningKey && nextSigningKey
    ? new Receiver({
        currentSigningKey,
        nextSigningKey,
      })
    : null;

/**
 * Validate QStash signature or local authorization
 */
async function verifyQStashRequest(req: NextRequest, rawBody: string): Promise<boolean> {
  // If QStash keys are configured, verify Upstash signature
  if (qstashReceiver) {
    const signature = req.headers.get("upstash-signature");
    if (!signature) {
      console.warn("[QStash Job] Missing Upstash-Signature header.");
      return false;
    }

    try {
      const isValid = await qstashReceiver.verify({
        signature,
        body: rawBody,
        url: req.url,
      });
      return isValid;
    } catch (err) {
      console.error("[QStash Job] Signature verification failed:", err);
      return false;
    }
  }

  // If CRON_SECRET is configured, check Bearer token / header
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  // Development mode / local testing fallback
  return true;
}

/**
 * Core processing logic: Find due reminders and create PENDING EmailLog records
 */
async function processDueMedicationReminders() {
  const now = new Date();

  // 1. Query all MedicationReminder rows due for sending
  const dueReminders = await prisma.medicationReminder.findMany({
    where: {
      scheduledFor: {
        lte: now,
      },
      status: ReminderStatus.PENDING,
    },
    include: {
      appointment: {
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
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      scheduledFor: "asc",
    },
  });

  if (dueReminders.length === 0) {
    return {
      processedCount: 0,
      reminders: [],
    };
  }

  const processedList: Array<{
    reminderId: string;
    medicineName: string;
    patientEmail: string;
    scheduledFor: Date;
    emailLogId: string;
  }> = [];

  // 2. Process each due reminder inside transaction
  await prisma.$transaction(async (tx) => {
    for (const rem of dueReminders) {
      const patientEmail = rem.appointment.patient.email;

      // Create EmailLog row for the reminder
      const emailLog = await tx.emailLog.create({
        data: {
          appointmentId: rem.appointmentId,
          toEmail: patientEmail,
          type: EmailType.MEDICATION_REMINDER,
          status: EmailStatus.PENDING,
          attempts: 0,
        },
      });

      // Update reminder status to SENT
      await tx.medicationReminder.update({
        where: { id: rem.id },
        data: {
          status: ReminderStatus.SENT,
          sentAt: now,
        },
      });

      processedList.push({
        reminderId: rem.id,
        medicineName: rem.medicineName,
        patientEmail,
        scheduledFor: rem.scheduledFor,
        emailLogId: emailLog.id,
      });
    }
  });

  console.log(
    `[QStash Job] Successfully processed ${processedList.length} due medication reminder(s).`
  );

  return {
    processedCount: processedList.length,
    reminders: processedList,
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const isAuthorized = await verifyQStashRequest(req, rawBody);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid QStash signature or credentials." },
        { status: 401 }
      );
    }

    const result = await processDueMedicationReminders();

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedCount} due medication reminder(s).`,
      data: result,
    });
  } catch (error) {
    console.error("[QStash Job] Error in send-due-reminders handler:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Internal server error processing reminders.",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Allow GET for quick manual testing / monitoring checks
  try {
    const isAuthorized = await verifyQStashRequest(req, "");
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const result = await processDueMedicationReminders();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: `Processed ${result.processedCount} due medication reminder(s).`,
      data: result,
    });
  } catch (error) {
    console.error("[QStash Job] Error in GET handler:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

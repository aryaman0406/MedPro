import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { EmailStatus, EmailType } from "@prisma/client";
import {
  renderBookingConfirmationEmail,
  renderAppointmentReminderEmail,
  renderCancellationEmail,
  renderLeaveNoticeEmail,
  renderMedicationReminderEmail,
  renderRescheduleNoticeEmail,
} from "@/lib/email/templates";
import { generateRescheduleToken } from "@/lib/tokens";

// App Base URL for links
const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * Configure Nodemailer Transport for Brevo SMTP
 */
function createTransporter() {
  // 1. Gmail SMTP option (if GMAIL_USER & GMAIL_APP_PASSWORD are provided)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // 2. Generic / Brevo / Resend SMTP option
  const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT) || 587;
  const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("⚠️ SMTP credentials (BREVO_SMTP_USER / BREVO_SMTP_KEY / GMAIL_USER) not configured.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: 10000,
  });
}

/**
 * Low-level email dispatcher with graceful dev/console fallback
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ messageId?: string }> {
  const user = process.env.BREVO_SMTP_USER || process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.BREVO_SMTP_KEY || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.log(`\n📨 [Simulated Email Dispatch] ───`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content Preview: ${text || subject}`);
    console.log(`──────────────────────────────────\n`);
    return { messageId: `mock-${Date.now()}` };
  }

  const transporter = createTransporter();
  const defaultFrom = process.env.GMAIL_USER
    ? `"MedTrack Pro" <${process.env.GMAIL_USER}>`
    : '"MedTrack Pro" <no-reply@medtrack.pro>';
  const from = process.env.EMAIL_FROM || defaultFrom;

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });
    return { messageId: info.messageId };
  } catch (error: unknown) {
    const errorMsg = (error as Error)?.message || "";

    // Check for Resend free tier test recipient restriction (550 error)
    const match = errorMsg.match(/own email address \(([^)]+)\)/i);
    const allowedTestingEmail = match ? match[1] : null;

    if (allowedTestingEmail && allowedTestingEmail.toLowerCase() !== to.toLowerCase()) {
      console.warn(
        `⚠️ [Email Relay] Resend test restriction detected. Rerouting message intended for [${to}] to owner account [${allowedTestingEmail}].`
      );
      const reroutedSubject = `[For: ${to}] ${subject}`;
      const reroutedHtml = `<div style="padding: 10px; margin-bottom: 15px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; font-family: sans-serif; font-size: 13px; color: #92400e;"><strong>Note:</strong> This email was originally addressed to <strong>${to}</strong>. It was delivered to your registered Resend testing inbox.</div>${html}`;

      const fallbackInfo = await transporter.sendMail({
        from,
        to: allowedTestingEmail,
        subject: reroutedSubject,
        html: reroutedHtml,
        text: `[Originally intended for ${to}]\n\n${text || ""}`,
      });

      return { messageId: fallbackInfo.messageId };
    }

    // Fallback simulation in dev if SMTP fails completely
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n📨 [Simulated Email Dispatch (Fallback)] ───`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Original Error: ${errorMsg}`);
      console.log(`──────────────────────────────────────────\n`);
      return { messageId: `mock-fallback-${Date.now()}` };
    }

    throw error;
  }
}

export interface EmailProcessResult {
  emailLogId: string;
  toEmail: string;
  type: EmailType;
  success: boolean;
  error?: string;
  status: EmailStatus;
}

/**
 * Helper to check if an email address belongs to a mock/placeholder domain.
 * Avoids sending real SMTP messages to non-existent seed addresses like doctor@medtrack.pro.
 */
export function isDummyEmail(email: string): boolean {
  if (!email) return true;
  const lower = email.toLowerCase().trim();
  return (
    lower.endsWith("@medtrack.pro") ||
    lower.endsWith("@example.com") ||
    lower.endsWith("@example.org") ||
    lower.endsWith("@example.net") ||
    lower.endsWith("@test.com") ||
    lower.endsWith("@localhost") ||
    lower.endsWith(".invalid")
  );
}

/**
 * Unified Email Queue Processor
 * Finds pending and retriable failed emails, renders templates, and sends via Brevo SMTP
 */
export async function processEmailQueue(
  batchLimit = 50
): Promise<{
  processed: number;
  sent: number;
  failed: number;
  dead: number;
  results: EmailProcessResult[];
}> {
  // Query all PENDING or retryable FAILED emails (attempts < 5)
  const pendingEmails = await prisma.emailLog.findMany({
    where: {
      OR: [
        { status: EmailStatus.PENDING },
        { status: EmailStatus.FAILED, attempts: { lt: 5 } },
      ],
    },
    include: {
      appointment: {
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
          medicationReminders: {
            take: 1,
            orderBy: { scheduledFor: "desc" },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: batchLimit,
  });

  let sent = 0;
  let failed = 0;
  let dead = 0;
  const results: EmailProcessResult[] = [];

  for (const emailLog of pendingEmails) {
    const attempts = emailLog.attempts + 1;

    // Skip real SMTP dispatch for dummy placeholder domains (e.g. seeded doctor emails like @medtrack.pro)
    if (isDummyEmail(emailLog.toEmail)) {
      console.log(`[Email Queue] Simulated dispatch for placeholder domain recipient: ${emailLog.toEmail}`);
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          lastError: null,
        },
      });
      sent++;
      results.push({
        emailLogId: emailLog.id,
        toEmail: emailLog.toEmail,
        type: emailLog.type,
        success: true,
        status: EmailStatus.SENT,
      });
      continue;
    }

    try {
      const appt = emailLog.appointment;
      let subject = "MedTrack Pro Notification";
      let html = `<p>MedTrack Pro Notification</p>`;
      let text = "MedTrack Pro Notification";

      // Build content according to EmailType
      switch (emailLog.type) {
        case EmailType.BOOKING_CONFIRMATION: {
          if (!appt) throw new Error("Associated appointment not found for booking confirmation email.");

          const isDoctorRecipient = emailLog.toEmail === appt.doctor.user.email;
          const rendered = renderBookingConfirmationEmail({
            isDoctor: isDoctorRecipient,
            patientName: appt.patient.name,
            patientEmail: appt.patient.email,
            doctorName: appt.doctor.user.name,
            specialization: appt.doctor.specialization,
            startTime: new Date(appt.startTime),
            endTime: new Date(appt.endTime),
            symptomText: appt.symptomText,
            portalUrl: isDoctorRecipient
              ? `${baseUrl}/doctor/appointments/${appt.id}`
              : `${baseUrl}/patient/appointments`,
          });
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          break;
        }

        case EmailType.REMINDER: {
          if (!appt) throw new Error("Associated appointment not found for reminder email.");

          const rendered = renderAppointmentReminderEmail({
            patientName: appt.patient.name,
            doctorName: appt.doctor.user.name,
            specialization: appt.doctor.specialization,
            startTime: new Date(appt.startTime),
            endTime: new Date(appt.endTime),
            portalUrl: `${baseUrl}/patient/appointments`,
          });
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          break;
        }

        case EmailType.CANCELLATION: {
          if (!appt) throw new Error("Associated appointment not found for cancellation email.");

          const isDoctorRecipient = emailLog.toEmail === appt.doctor.user.email;
          const rendered = renderCancellationEmail({
            isDoctor: isDoctorRecipient,
            patientName: appt.patient.name,
            doctorName: appt.doctor.user.name,
            startTime: new Date(appt.startTime),
            portalUrl: `${baseUrl}/patient/find-doctor`,
          });
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          break;
        }

        case EmailType.LEAVE_NOTICE: {
          if (!appt) throw new Error("Associated appointment not found for leave notice email.");

          // Generate 7-day magic token for passwordless rescheduling
          const token = await generateRescheduleToken({
            appointmentId: appt.id,
            patientId: appt.patientId,
            doctorId: appt.doctorId,
            email: emailLog.toEmail,
          });

          const rescheduleUrl = `${baseUrl}/reschedule/${token}`;

          const rendered = renderLeaveNoticeEmail({
            patientName: appt.patient.name,
            doctorName: appt.doctor.user.name,
            specialization: appt.doctor.specialization,
            originalDate: new Date(appt.startTime),
            rescheduleUrl,
          });
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          break;
        }

        case EmailType.RESCHEDULE_NOTICE: {
          if (!appt) throw new Error("Associated appointment not found for reschedule notice email.");

          const isDoctorRecipient = emailLog.toEmail === appt.doctor.user.email;
          const rendered = renderRescheduleNoticeEmail({
            isDoctor: isDoctorRecipient,
            patientName: appt.patient.name,
            doctorName: appt.doctor.user.name,
            specialization: appt.doctor.specialization,
            originalStartTime: new Date(appt.createdAt),
            newStartTime: new Date(appt.startTime),
            newEndTime: new Date(appt.endTime),
            portalUrl: isDoctorRecipient
              ? `${baseUrl}/doctor/appointments/${appt.id}`
              : `${baseUrl}/patient/appointments`,
          });
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          break;
        }

        case EmailType.MEDICATION_REMINDER: {
          const patientName = appt?.patient.name || "Patient";
          const reminderInfo = appt?.medicationReminders?.[0];
          const medicineName = reminderInfo?.medicineName || "Prescribed Medication";
          const dosage = reminderInfo?.dosage || null;
          const instructions = reminderInfo?.instructions || null;

          const rendered = renderMedicationReminderEmail({
            patientName,
            medicineName,
            dosage,
            instructions,
            portalUrl: `${baseUrl}/patient/appointments`,
          });
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          break;
        }

        default:
          throw new Error(`Unsupported email type: ${emailLog.type}`);
      }

      // Dispatch email via Nodemailer
      await sendEmail({
        to: emailLog.toEmail,
        subject,
        html,
        text,
      });

      // Mark SENT on success
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          lastError: null,
        },
      });

      sent++;
      results.push({
        emailLogId: emailLog.id,
        toEmail: emailLog.toEmail,
        type: emailLog.type,
        success: true,
        status: EmailStatus.SENT,
      });
    } catch (err: unknown) {
      const errorMsg = (err as Error)?.message || "Failed to dispatch email.";
      console.error(`[Email Queue] Failed to send email [${emailLog.id}] to ${emailLog.toEmail}:`, errorMsg);

      const nextStatus = attempts >= 5 ? EmailStatus.DEAD : EmailStatus.FAILED;

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          attempts,
          lastError: errorMsg,
          status: nextStatus,
        },
      });

      if (nextStatus === EmailStatus.DEAD) {
        dead++;
      } else {
        failed++;
      }

      results.push({
        emailLogId: emailLog.id,
        toEmail: emailLog.toEmail,
        type: emailLog.type,
        success: false,
        error: errorMsg,
        status: nextStatus,
      });
    }
  }

  return {
    processed: pendingEmails.length,
    sent,
    failed,
    dead,
    results,
  };
}

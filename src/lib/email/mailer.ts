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

// App Base URL for links — strictly use HTTPS production URL to prevent spam filters flagging localhost links
const baseUrl =
  process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")
    ? process.env.NEXTAUTH_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://med-pro-one.vercel.app";

/**
 * Configure Nodemailer Transport.
 * Priority: Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) > Generic SMTP.
 */
function createTransporter() {
  // 1. Gmail SMTP (preferred — requires App Password, not account password)
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });
  }

  // 2. Generic SMTP fallback (Brevo, Resend, etc.)
  const host = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || "smtp-relay.brevo.com";
  const port = Number(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT) || 587;
  const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("⚠️ SMTP credentials not configured. Emails will be simulated in console.");
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
 * Verify SMTP connection is alive and credentials are accepted.
 * Call from a health-check route to confirm Gmail auth works.
 */
export async function verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const genericUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
  const genericPass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;

  if (!gmailUser && !genericUser) {
    return { ok: false, error: "No SMTP credentials configured (GMAIL_USER or BREVO_SMTP_USER/SMTP_USER)" };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { ok: true };
  } catch (err: unknown) {
    const e = err as Error & { code?: string; response?: string; responseCode?: number };
    const errorDetail = [
      e.message,
      e.code ? `code=${e.code}` : null,
      e.responseCode ? `responseCode=${e.responseCode}` : null,
      e.response ? `response=${e.response}` : null,
    ].filter(Boolean).join(" | ");
    console.error("[SMTP Verify] Failed:", errorDetail);
    return { ok: false, error: errorDetail };
  }
}

/**
 * Low-level email dispatcher with anti-spam deliverability headers.
 * - If no SMTP credentials are configured at all, logs to console (simulation).
 * - If credentials are configured, sends via SMTP and THROWS on failure.
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
  const hasGmail = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
  const hasGeneric = (process.env.BREVO_SMTP_USER || process.env.SMTP_USER) &&
                     (process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS);

  // Only simulate if NO credentials are configured at all
  if (!hasGmail && !hasGeneric) {
    console.log(`\n📨 [Simulated Email — No SMTP Configured] ───`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content Preview: ${(text || subject).substring(0, 200)}`);
    console.log(`──────────────────────────────────\n`);
    return { messageId: `mock-no-creds-${Date.now()}` };
  }

  const transporter = createTransporter();
  const gmailUser = process.env.GMAIL_USER;
  const from = process.env.EMAIL_FROM || (gmailUser
    ? `"MedTrack Pro" <${gmailUser}>`
    : '"MedTrack Pro" <no-reply@medtrack.pro>');

  // Send via SMTP with deliverability headers — errors propagate to caller
  try {
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: gmailUser || from,
      subject,
      html,
      text,
      headers: {
        "X-Entity-Ref-ID": `medtrack-${Date.now()}`,
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
        "Precedence": "bulk",
        "X-Priority": "3",
      },
    });
    console.log(`[SMTP] Sent to ${to} — messageId: ${info.messageId}`);
    return { messageId: info.messageId };
  } catch (error: unknown) {
    const e = error as Error & { code?: string; response?: string; responseCode?: number };
    const errorDetail = [
      e.message,
      e.code ? `code=${e.code}` : null,
      e.responseCode ? `responseCode=${e.responseCode}` : null,
      e.response ? `response=${e.response}` : null,
    ].filter(Boolean).join(" | ");
    console.error(`[SMTP] FAILED to send to ${to}: ${errorDetail}`);
    throw new Error(errorDetail);
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
 * Unified Email Queue Processor.
 * Finds pending and retriable failed emails, renders templates, and sends via SMTP.
 * Errors are recorded in lastError — never silently swallowed.
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
          attempts,
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

      // Dispatch email via SMTP — throws on failure (no silent fallback)
      await sendEmail({
        to: emailLog.toEmail,
        subject,
        html,
        text,
      });

      // Mark SENT on success — record attempts count for auditability
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: EmailStatus.SENT,
          attempts,
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
      const e = err as Error & { code?: string; response?: string; responseCode?: number };
      const errorMsg = [
        e.message || "Failed to dispatch email.",
        e.code ? `code=${e.code}` : null,
        e.responseCode ? `responseCode=${e.responseCode}` : null,
      ].filter(Boolean).join(" | ");
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

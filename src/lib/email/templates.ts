import { format } from "date-fns";
import { getGoogleCalendarUrl } from "@/lib/google-calendar-helper";

export interface BrandedEmailProps {
  previewText: string;
  headline: string;
  badgeText?: string;
  badgeColor?: string;
  childrenHtml: string;
}

/**
 * Shared Branded HTML Layout with MedTrack Pro Header, Container, and Footer
 * Engineered with 100% email-client compatible table layouts (Gmail, Outlook, Apple Mail).
 * Optimized with anti-spam preheader, clean typography, and zero spam-scoring tokens.
 */
export function renderBrandedLayout({
  previewText,
  headline,
  badgeText,
  badgeColor = "#0284c7",
  childrenHtml,
}: BrandedEmailProps): string {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${headline}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; -webkit-font-smoothing: antialiased; }
    .email-container { max-width: 580px; margin: 24px auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-block; background: #0284c7; color: #ffffff; font-weight: 700; font-size: 13px; padding: 5px 12px; border-radius: 6px; margin-bottom: 10px; letter-spacing: 0.5px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3; }
    .content { padding: 28px 24px; line-height: 1.6; font-size: 14px; color: #334155; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 12px 0; text-align: center; }
    .btn-secondary { background-color: #ffffff; color: #0284c7 !important; border: 1px solid #0284c7; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .footer a { color: #64748b; text-decoration: underline; }
  </style>
</head>
<body>
  <!-- Anti-Spam Zero-Pixel Preheader Container -->
  <div style="display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${previewText}
  </div>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="logo-badge">MEDTRACK PRO</div>
      ${
        badgeText
          ? `<div style="margin-bottom: 8px;"><span class="badge" style="background-color: ${badgeColor}; color: #ffffff;">${badgeText}</span></div>`
          : ""
      }
      <h1>${headline}</h1>
    </div>

    <!-- Content -->
    <div class="content">
      ${childrenHtml}
    </div>

    <!-- Transactional Compliance Footer -->
    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">MedTrack Pro Clinical Services</p>
      <p style="margin: 0 0 8px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
        You received this automated transactional notification regarding your medical consultation with MedTrack Pro.
      </p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">© ${currentYear} MedTrack Pro. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// 1. Booking Confirmation Template
export function renderBookingConfirmationEmail(params: {
  isDoctor: boolean;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  specialization: string;
  startTime: Date;
  endTime: Date;
  symptomText: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const dateStr = format(params.startTime, "EEEE, MMMM do, yyyy");
  const timeStr = `${format(params.startTime, "hh:mm a")} - ${format(params.endTime, "hh:mm a")}`;

  const subject = params.isDoctor
    ? `New Consultation: ${params.patientName} on ${format(params.startTime, "MMM d, yyyy")}`
    : `Booking Confirmed: Consultation with ${params.doctorName} on ${format(params.startTime, "MMM d, yyyy")}`;

  const recipientGreeting = params.isDoctor ? `Hello ${params.doctorName},` : `Hello ${params.patientName},`;
  const mainMessage = params.isDoctor
    ? `A new patient consultation has been scheduled in your clinic calendar. Please review the appointment overview below.`
    : `Your medical consultation has been successfully booked and confirmed in the clinic schedule.`;

  const googleCalUrl = getGoogleCalendarUrl({
    title: `Medical Consultation - ${params.doctorName}`,
    doctorName: params.doctorName,
    patientName: params.patientName,
    symptomText: params.symptomText,
    startTime: params.startTime,
    endTime: params.endTime,
  });

  const html = renderBrandedLayout({
    previewText: `Consultation details for ${dateStr} at ${timeStr}`,
    headline: params.isDoctor ? "New Patient Consultation Booked" : "Consultation Confirmed",
    badgeText: "CONFIRMED",
    badgeColor: "#10b981",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0; font-weight: 600;">${recipientGreeting}</p>
      <p style="margin-bottom: 20px;">${mainMessage}</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; border-collapse: separate; overflow: hidden;">
        <tr>
          <td colspan="2" style="font-weight: 700; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding: 10px 14px; background-color: #f1f5f9;">
            Appointment Overview
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 140px; border-bottom: 1px solid #e2e8f0;">Doctor Name:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${params.doctorName} <span style="font-weight: 500; color: #64748b;">(${params.specialization})</span></td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Patient Name:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${params.patientName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Patient Email:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0284c7; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${params.patientEmail}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Appointment Date:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600;">Time Window:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700;">${timeStr}</td>
        </tr>
      </table>

      <div style="margin: 20px 0;">
        <span style="font-weight: 700; color: #0f172a; font-size: 13px; display: block; margin-bottom: 8px;">
          Intake Symptoms &amp; Notes:
        </span>
        <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #334155; border-left: 3px solid #0284c7;">
          ${params.symptomText}
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${params.portalUrl}" class="btn" style="margin-right: 8px;">View Appointment in Portal</a>
        <a href="${googleCalUrl}" target="_blank" class="btn btn-secondary">Add to Google Calendar</a>
      </div>
    `,
  });

  const text = `${subject}\n\n${recipientGreeting}\n\n${mainMessage}\n\nDoctor Name: ${params.doctorName} (${params.specialization})\nPatient Name: ${params.patientName}\nPatient Email: ${params.patientEmail}\nAppointment Date: ${dateStr}\nTime Window: ${timeStr}\nIntake Symptoms: "${params.symptomText}"\n\nView Portal: ${params.portalUrl}\nAdd to Google Calendar: ${googleCalUrl}`;

  return { subject, html, text };
}

// 2. 24-Hour Reminder Template
export function renderAppointmentReminderEmail(params: {
  patientName: string;
  doctorName: string;
  specialization: string;
  startTime: Date;
  endTime: Date;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const dateStr = format(params.startTime, "EEEE, MMMM do, yyyy");
  const timeStr = `${format(params.startTime, "hh:mm a")} - ${format(params.endTime, "hh:mm a")}`;

  const subject = `Reminder: Consultation with ${params.doctorName} tomorrow at ${format(params.startTime, "hh:mm a")}`;

  const html = renderBrandedLayout({
    previewText: `Upcoming consultation tomorrow at ${timeStr} with ${params.doctorName}`,
    headline: "Consultation Reminder",
    badgeText: "UPCOMING",
    badgeColor: "#0284c7",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0; font-weight: 600;">Hello ${params.patientName},</p>
      <p>This is a reminder for your upcoming medical consultation scheduled for tomorrow.</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; border-collapse: separate; overflow: hidden;">
        <tr>
          <td colspan="2" style="font-weight: 700; font-size: 13px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding: 10px 14px; background-color: #f1f5f9;">
            Appointment Details
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; width: 140px; border-bottom: 1px solid #e2e8f0;">Doctor Name:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${params.doctorName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Specialization:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${params.specialization}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Patient Name:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${params.patientName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Appointment Date:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 600;">Time Window:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700;">${timeStr}</td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #64748b;">
        Please ensure you are ready 5 minutes before your scheduled start time.
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${params.portalUrl}" class="btn">View Appointment in Portal</a>
      </div>
    `,
  });

  const text = `${subject}\n\nHello ${params.patientName},\n\nReminder for your consultation with ${params.doctorName} (${params.specialization}) tomorrow on ${dateStr} at ${timeStr}.\n\nView Portal: ${params.portalUrl}`;

  return { subject, html, text };
}

// 3. Cancellation Template
export function renderCancellationEmail(params: {
  isDoctor: boolean;
  patientName: string;
  doctorName: string;
  startTime: Date;
  reason?: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const dateStr = format(params.startTime, "EEEE, MMMM do, yyyy");
  const timeStr = format(params.startTime, "hh:mm a");

  const subject = `Consultation Cancelled: ${params.doctorName} on ${format(params.startTime, "MMM d, yyyy")}`;
  const recipientGreeting = params.isDoctor ? `Hello ${params.doctorName},` : `Hello ${params.patientName},`;

  const html = renderBrandedLayout({
    previewText: `Consultation on ${dateStr} at ${timeStr} has been cancelled`,
    headline: "Consultation Cancelled",
    badgeText: "CANCELLED",
    badgeColor: "#ef4444",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0; font-weight: 600;">${recipientGreeting}</p>
      <p>The consultation scheduled for <strong>${dateStr} at ${timeStr}</strong> has been cancelled.</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin: 20px 0; border-collapse: separate; overflow: hidden;">
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #991b1b; font-weight: 600; width: 140px; border-bottom: 1px solid #fee2e2;">Doctor Name:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #7f1d1d; font-weight: 700; border-bottom: 1px solid #fee2e2;">${params.doctorName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #991b1b; font-weight: 600; border-bottom: 1px solid #fee2e2;">Patient Name:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #7f1d1d; font-weight: 700; border-bottom: 1px solid #fee2e2;">${params.patientName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #991b1b; font-weight: 600;">Cancelled Date:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #7f1d1d; font-weight: 700;">${dateStr} at ${timeStr}</td>
        </tr>
        ${
          params.reason
            ? `<tr><td style="padding: 10px 14px; font-size: 13px; color: #991b1b; font-weight: 600; border-top: 1px solid #fee2e2;">Cancellation Note:</td><td style="padding: 10px 14px; font-size: 13px; color: #7f1d1d; font-weight: 600; border-top: 1px solid #fee2e2;">${params.reason}</td></tr>`
            : ""
        }
      </table>

      <p style="font-size: 13px; color: #64748b;">
        If you need to book a new consultation, you can easily find available specialists on our online portal.
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${params.portalUrl}" class="btn">Browse Available Doctors</a>
      </div>
    `,
  });

  const text = `${subject}\n\n${recipientGreeting}\n\nThe consultation on ${dateStr} at ${timeStr} has been cancelled.\n\nBook a new consultation: ${params.portalUrl}`;

  return { subject, html, text };
}

// 4. Leave Notice with Magic Link Reschedule Template
export function renderLeaveNoticeEmail(params: {
  patientName: string;
  doctorName: string;
  specialization: string;
  originalDate: Date;
  rescheduleUrl: string;
}): { subject: string; html: string; text: string } {
  const originalDateStr = format(params.originalDate, "EEEE, MMMM do, yyyy");

  const subject = `Action Required: Reschedule your consultation with ${params.doctorName}`;

  const html = renderBrandedLayout({
    previewText: `Doctor schedule update: Select a new appointment time`,
    headline: "Doctor Schedule Update",
    badgeText: "RESCHEDULE REQUIRED",
    badgeColor: "#f59e0b",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0; font-weight: 600;">Hello ${params.patientName},</p>
      <p>
        ${params.doctorName} has registered clinical leave for <strong>${originalDateStr}</strong> and will be unavailable on that date.
      </p>

      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0; color: #92400e; font-size: 13px;">
        <strong style="display: block; margin-bottom: 4px; font-size: 14px;">Instant One-Click Rescheduling</strong>
        You can select a new consultation time right away with no login required using your secure link below:
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.rescheduleUrl}" class="btn">
          Choose a New Appointment Time
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        This secure link will expire in 7 days.
      </p>
    `,
  });

  const text = `${subject}\n\nHello ${params.patientName},\n\n${params.doctorName} has registered leave on ${originalDateStr}.\n\nPick a new appointment time using your instant magic link:\n${params.rescheduleUrl}\n\n(Expires in 7 days)`;

  return { subject, html, text };
}

// 5. Medication Reminder Template
export function renderMedicationReminderEmail(params: {
  patientName: string;
  medicineName: string;
  dosage?: string | null;
  instructions?: string | null;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Medication Reminder: Time to take your ${params.medicineName}`;

  const html = renderBrandedLayout({
    previewText: `Medication dose reminder for ${params.medicineName}`,
    headline: "Medication Reminder",
    badgeText: "PRESCRIPTION REMINDER",
    badgeColor: "#0284c7",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0; font-weight: 600;">Hello ${params.patientName},</p>
      <p>This is your scheduled clinical reminder to take your prescribed medication.</p>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 16px; font-weight: 700; color: #166534; margin-bottom: 6px;">
          ${params.medicineName}
        </div>
        ${
          params.dosage
            ? `<div style="font-size: 13px; font-weight: 600; color: #15803d; margin-bottom: 6px;"><strong>Dosage:</strong> ${params.dosage}</div>`
            : ""
        }
        ${
          params.instructions
            ? `<div style="font-size: 13px; color: #166534; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #dcfce7; margin-top: 6px;"><strong>Instructions:</strong> ${params.instructions}</div>`
            : ""
        }
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${params.portalUrl}" class="btn">View Care Plan</a>
      </div>
    `,
  });

  const text = `${subject}\n\nHello ${params.patientName},\n\nTime to take your medication:\nMedicine: ${params.medicineName}\nDosage: ${params.dosage || "As prescribed"}\nInstructions: ${params.instructions || "None"}\n\nView Portal: ${params.portalUrl}`;

  return { subject, html, text };
}

// 6. Admin Reschedule Notice Template
export function renderRescheduleNoticeEmail(params: {
  isDoctor: boolean;
  patientName: string;
  doctorName: string;
  specialization: string;
  originalStartTime: Date;
  newStartTime: Date;
  newEndTime: Date;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const oldDateStr = format(params.originalStartTime, "EEEE, MMMM do, yyyy 'at' hh:mm a");
  const newDateStr = format(params.newStartTime, "EEEE, MMMM do, yyyy");
  const newTimeStr = `${format(params.newStartTime, "hh:mm a")} - ${format(params.newEndTime, "hh:mm a")}`;

  const subject = params.isDoctor
    ? `Schedule Update: Consultation for ${params.patientName} Rescheduled`
    : `Appointment Rescheduled: Your Consultation with ${params.doctorName}`;

  const recipientGreeting = params.isDoctor ? `Hello ${params.doctorName},` : `Hello ${params.patientName},`;
  const mainMessage = params.isDoctor
    ? `A patient consultation has been rescheduled in your clinic calendar by administration.`
    : `Your medical consultation has been successfully rescheduled by clinic administration to a new date and time.`;

  const html = renderBrandedLayout({
    previewText: `Your consultation has been rescheduled to ${newDateStr} at ${newTimeStr}`,
    headline: "Consultation Rescheduled",
    badgeText: "RESCHEDULED",
    badgeColor: "#0284c7",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0; font-weight: 600;">${recipientGreeting}</p>
      <p style="margin-bottom: 20px;">${mainMessage}</p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; margin: 20px 0; border-collapse: separate; overflow: hidden;">
        <tr>
          <td colspan="2" style="font-weight: 700; font-size: 13px; color: #0369a1; border-bottom: 1px solid #bae6fd; padding: 10px 14px; background-color: #e0f2fe;">
            Updated Consultation Details
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #0369a1; font-weight: 600; width: 140px; border-bottom: 1px solid #bae6fd;">Assigned Doctor:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #bae6fd;">${params.doctorName} <span style="font-weight: 500; color: #64748b;">(${params.specialization})</span></td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #0369a1; font-weight: 600; border-bottom: 1px solid #bae6fd;">Patient Name:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #bae6fd;">${params.patientName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #0369a1; font-weight: 600; border-bottom: 1px solid #bae6fd;">Previous Time:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 500; text-decoration: line-through; border-bottom: 1px solid #bae6fd;">${oldDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #0369a1; font-weight: 600; border-bottom: 1px solid #bae6fd;">New Date:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0369a1; font-weight: 700; border-bottom: 1px solid #bae6fd;">${newDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #0369a1; font-weight: 600;">New Time Window:</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0369a1; font-weight: 700;">${newTimeStr}</td>
        </tr>
      </table>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${params.portalUrl}" class="btn">View Updated Appointment</a>
      </div>
    `,
  });

  const text = `${subject}\n\n${recipientGreeting}\n\n${mainMessage}\n\nDoctor: ${params.doctorName} (${params.specialization})\nPatient: ${params.patientName}\nPrevious Time: ${oldDateStr}\nNew Date: ${newDateStr}\nNew Time Window: ${newTimeStr}\n\nView Portal: ${params.portalUrl}`;

  return { subject, html, text };
}

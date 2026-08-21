import { format } from "date-fns";

export interface BrandedEmailProps {
  previewText: string;
  headline: string;
  badgeText?: string;
  badgeColor?: string;
  childrenHtml: string;
}

/**
 * Shared Branded HTML Layout with MedTrack Pro Header, Container, and Footer
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
    .email-container { max-width: 580px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-block; background: #0284c7; color: #ffffff; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 8px; margin-bottom: 12px; letter-spacing: 0.5px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; color: #334155; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-value { color: #0f172a; font-weight: 600; text-align: right; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-weight: 600; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 10px; margin: 16px 0; text-align: center; }
    .btn-secondary { background-color: #e2e8f0; color: #0f172a !important; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { background-color: #f8fafc; padding: 24px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
    .footer a { color: #64748b; text-decoration: underline; }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${previewText}
  </div>

  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="logo-badge">✦ MEDTRACK PRO</div>
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

    <!-- Footer -->
    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">MedTrack Pro Healthcare Services</p>
      <p style="margin: 0 0 8px 0;">Automated Clinical Notifications • Confidential Patient Communications</p>
      <p style="margin: 0; font-size: 11px;">© ${currentYear} MedTrack Pro. All rights reserved.</p>
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
    ? `A new patient consultation has been scheduled with you. Below are the appointment details and intake symptoms.`
    : `Your medical consultation has been successfully booked and confirmed in the clinic schedule.`;

  const html = renderBrandedLayout({
    previewText: `Consultation details for ${dateStr} at ${timeStr}`,
    headline: params.isDoctor ? "New Patient Consultation Booked" : "Consultation Confirmed!",
    badgeText: "CONFIRMED",
    badgeColor: "#10b981",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0;">${recipientGreeting}</p>
      <p>${mainMessage}</p>

      <div class="card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          Appointment Overview
        </div>
        <div class="info-row">
          <span class="info-label">Doctor</span>
          <span class="info-value">${params.doctorName} (${params.specialization})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Patient</span>
          <span class="info-value">${params.patientName} (${params.patientEmail})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${dateStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time Window</span>
          <span class="info-value">${timeStr}</span>
        </div>
      </div>

      <div style="margin: 18px 0;">
        <span style="font-weight: 700; color: #0f172a; font-size: 13px; display: block; margin-bottom: 6px;">
          Intake Symptoms &amp; Notes:
        </span>
        <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-style: italic; font-size: 13px; color: #334155;">
          "${params.symptomText}"
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${params.portalUrl}" class="btn">View Appointment in Portal</a>
      </div>
    `,
  });

  const text = `${subject}\n\n${recipientGreeting}\n\n${mainMessage}\n\nDoctor: ${params.doctorName} (${params.specialization})\nPatient: ${params.patientName}\nDate: ${dateStr}\nTime: ${timeStr}\nSymptoms: "${params.symptomText}"\n\nView Portal: ${params.portalUrl}`;

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
    headline: "Consultation Reminder (24h)",
    badgeText: "UPCOMING",
    badgeColor: "#0284c7",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0;">Hello ${params.patientName},</p>
      <p>This is a friendly reminder for your upcoming medical consultation scheduled for tomorrow.</p>

      <div class="card">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
          Appointment Details
        </div>
        <div class="info-row">
          <span class="info-label">Doctor</span>
          <span class="info-value">${params.doctorName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Specialization</span>
          <span class="info-value">${params.specialization}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span class="info-value">${dateStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time Window</span>
          <span class="info-value">${timeStr}</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        Please ensure you are ready 5 minutes before your scheduled start time.
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${params.portalUrl}" class="btn">View Appointment</a>
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
      <p style="font-size: 15px; margin-top: 0;">${recipientGreeting}</p>
      <p>The consultation scheduled for <strong>${dateStr} at ${timeStr}</strong> has been cancelled.</p>

      ${
        params.reason
          ? `<div class="card"><span class="info-label block" style="margin-bottom: 4px;">Cancellation Note:</span><span style="font-weight: 600; color: #0f172a;">${params.reason}</span></div>`
          : ""
      }

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
    previewText: `Doctor leave notice: Click here to easily pick a new consultation time`,
    headline: "Doctor Schedule Update",
    badgeText: "RESCHEDULE REQUIRED",
    badgeColor: "#f59e0b",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0;">Hello ${params.patientName},</p>
      <p>
        ${params.doctorName} has registered clinical leave for <strong>${originalDateStr}</strong> and will be unavailable on that date.
      </p>

      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 18px; margin: 20px 0; color: #92400e; font-size: 13px;">
        <strong style="display: block; margin-bottom: 4px; font-size: 14px;">Instant One-Click Rescheduling</strong>
        We apologize for any inconvenience. You can pick a new available consultation time right away with no login required using your personal magic link below:
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${params.rescheduleUrl}" class="btn" style="background-color: #0284c7; padding: 14px 32px; font-size: 15px;">
          Choose a New Appointment Time →
        </a>
      </div>

      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        This secure link will expire in 7 days. If you prefer to consult a different specialist, you can also browse other doctors on our portal.
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
    headline: "Medication Dose Reminder",
    badgeText: "PRESCRIPTION REMINDER",
    badgeColor: "#0284c7",
    childrenHtml: `
      <p style="font-size: 15px; margin-top: 0;">Hello ${params.patientName},</p>
      <p>This is your scheduled clinical reminder to take your prescribed medication.</p>

      <div class="card" style="background-color: #f0fdf4; border-color: #bbf7d0;">
        <div style="font-size: 18px; font-weight: 700; color: #166534; margin-bottom: 4px;">
          💊 ${params.medicineName}
        </div>
        ${
          params.dosage
            ? `<div style="font-size: 14px; font-weight: 600; color: #15803d; margin-bottom: 8px;">Dosage: ${params.dosage}</div>`
            : ""
        }
        ${
          params.instructions
            ? `<div style="font-size: 13px; color: #166534; background: #ffffff; padding: 10px 14px; border-radius: 8px; border: 1px solid #dcfce7; margin-top: 8px;"><strong>Instructions:</strong> ${params.instructions}</div>`
            : ""
        }
      </div>

      <p style="font-size: 13px; color: #64748b;">
        Taking your medications consistently as directed ensures the best recovery outcome. Review your full post-visit care plan on your portal dashboard.
      </p>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${params.portalUrl}" class="btn">View My Care Plan</a>
      </div>
    `,
  });

  const text = `${subject}\n\nHello ${params.patientName},\n\nTime to take your medication:\nMedicine: ${params.medicineName}\nDosage: ${params.dosage || "As prescribed"}\nInstructions: ${params.instructions || "None"}\n\nView Portal: ${params.portalUrl}`;

  return { subject, html, text };
}

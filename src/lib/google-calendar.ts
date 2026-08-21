import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

/**
 * Configure Google OAuth2 Client
 */
export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${baseUrl}/api/auth/google-calendar/callback`;

  if (!clientId || !clientSecret) {
    console.warn("⚠️ Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) not configured.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate Google OAuth Consent URL
 */
export function generateGoogleAuthUrl(userId: string, returnUrl?: string): string {
  const oauth2Client = getGoogleOAuthClient();

  const statePayload = Buffer.from(
    JSON.stringify({ userId, returnUrl: returnUrl || "/patient/appointments" })
  ).toString("base64url");

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state: statePayload,
  });
}

/**
 * Exchange Authorization Code for Refresh and Access Tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  userId: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token && !tokens.access_token) {
      return { success: false, error: "Failed to retrieve authentication tokens from Google." };
    }

    oauth2Client.setCredentials(tokens);

    // Retrieve user's Google email for dashboard display
    let connectedEmail: string | undefined;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userinfo = await oauth2.userinfo.get();
      connectedEmail = userinfo.data.email || undefined;
    } catch {
      // Non-critical fallback
    }

    // Persist tokens server-side only
    await prisma.googleCalendarAuth.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || "",
        expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
        needsReauth: false,
        connectedEmail,
      },
      update: {
        accessToken: tokens.access_token || null,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
        needsReauth: false,
        connectedEmail: connectedEmail || undefined,
      },
    });

    return { success: true, email: connectedEmail };
  } catch (error) {
    console.error("[Google Calendar] Error exchanging code for tokens:", error);
    return { success: false, error: (error as Error).message || "OAuth token exchange failed." };
  }
}

/**
 * Get authenticated Calendar API instance for a user
 */
async function getAuthenticatedCalendarClient(userId: string) {
  const authRecord = await prisma.googleCalendarAuth.findUnique({
    where: { userId },
  });

  if (!authRecord || !authRecord.refreshToken || authRecord.needsReauth) {
    return null;
  }

  const oauth2Client = getGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: authRecord.refreshToken,
    access_token: authRecord.accessToken || undefined,
  });

  return {
    calendar: google.calendar({ version: "v3", auth: oauth2Client }),
    authRecord,
  };
}

/**
 * Sync Appointment to Connected Google Calendars (Patient & Doctor)
 */
export async function syncAppointmentToGoogleCalendar(appointmentId: string): Promise<{
  patientSynced: boolean;
  doctorSynced: boolean;
}> {
  let patientSynced = false;
  let doctorSynced = false;

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!appt) return { patientSynced: false, doctorSynced: false };

    const startTimeIso = new Date(appt.startTime).toISOString();
    const endTimeIso = new Date(appt.endTime).toISOString();

    // 1. Sync for Patient (if calendar connected)
    try {
      const patientClient = await getAuthenticatedCalendarClient(appt.patient.id);
      if (patientClient) {
        const eventRes = await patientClient.calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: `Appointment: ${appt.doctor.user.name} (${appt.doctor.specialization})`,
            description: `Medical consultation with ${appt.doctor.user.name}.\n\nReason/Symptoms: "${appt.symptomText}"\n\nClinic Portal: ${baseUrl}/patient/appointments\nAppointment ID: ${appt.id}`,
            start: { dateTime: startTimeIso },
            end: { dateTime: endTimeIso },
            reminders: {
              useDefault: false,
              overrides: [
                { method: "email", minutes: 24 * 60 },
                { method: "popup", minutes: 30 },
              ],
            },
          },
        });

        if (eventRes.data.id) {
          await prisma.calendarEvent.upsert({
            where: {
              appointmentId_userId: {
                appointmentId: appt.id,
                userId: appt.patient.id,
              },
            },
            create: {
              appointmentId: appt.id,
              userId: appt.patient.id,
              googleEventId: eventRes.data.id,
              status: "SYNCED",
            },
            update: {
              googleEventId: eventRes.data.id,
              status: "SYNCED",
              lastError: null,
            },
          });
          patientSynced = true;
        }
      }
    } catch (err: unknown) {
      console.error(`[Google Calendar] Patient sync failed for appt [${appointmentId}]:`, err);
      const isAuthError =
        (err as { code?: number })?.code === 401 ||
        (err as { response?: { status?: number } })?.response?.status === 401 ||
        (err as Error)?.message?.includes("invalid_grant");

      if (isAuthError) {
        await prisma.googleCalendarAuth.update({
          where: { userId: appt.patient.id },
          data: { needsReauth: true },
        });
      }

      await prisma.calendarEvent.upsert({
        where: {
          appointmentId_userId: {
            appointmentId: appt.id,
            userId: appt.patient.id,
          },
        },
        create: {
          appointmentId: appt.id,
          userId: appt.patient.id,
          googleEventId: "FAILED",
          status: "FAILED",
          lastError: (err as Error)?.message,
        },
        update: {
          status: "FAILED",
          lastError: (err as Error)?.message,
        },
      });
    }

    // 2. Sync for Doctor (if calendar connected)
    try {
      const doctorUserId = appt.doctor.user.id;
      const doctorClient = await getAuthenticatedCalendarClient(doctorUserId);
      if (doctorClient) {
        const eventRes = await doctorClient.calendar.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: `Appointment: ${appt.patient.name}`,
            description: `Patient consultation with ${appt.patient.name} (${appt.patient.email}).\n\nSymptoms: "${appt.symptomText}"\n\nDoctor Clinical Encounter: ${baseUrl}/doctor/appointments/${appt.id}\nAppointment ID: ${appt.id}`,
            start: { dateTime: startTimeIso },
            end: { dateTime: endTimeIso },
            reminders: {
              useDefault: false,
              overrides: [
                { method: "email", minutes: 60 },
                { method: "popup", minutes: 15 },
              ],
            },
          },
        });

        if (eventRes.data.id) {
          await prisma.calendarEvent.upsert({
            where: {
              appointmentId_userId: {
                appointmentId: appt.id,
                userId: doctorUserId,
              },
            },
            create: {
              appointmentId: appt.id,
              userId: doctorUserId,
              googleEventId: eventRes.data.id,
              status: "SYNCED",
            },
            update: {
              googleEventId: eventRes.data.id,
              status: "SYNCED",
              lastError: null,
            },
          });
          doctorSynced = true;
        }
      }
    } catch (err: unknown) {
      console.error(`[Google Calendar] Doctor sync failed for appt [${appointmentId}]:`, err);
      const doctorUserId = appt.doctor.user.id;
      const isAuthError =
        (err as { code?: number })?.code === 401 ||
        (err as { response?: { status?: number } })?.response?.status === 401 ||
        (err as Error)?.message?.includes("invalid_grant");

      if (isAuthError) {
        await prisma.googleCalendarAuth.update({
          where: { userId: doctorUserId },
          data: { needsReauth: true },
        });
      }

      await prisma.calendarEvent.upsert({
        where: {
          appointmentId_userId: {
            appointmentId: appt.id,
            userId: doctorUserId,
          },
        },
        create: {
          appointmentId: appt.id,
          userId: doctorUserId,
          googleEventId: "FAILED",
          status: "FAILED",
          lastError: (err as Error)?.message,
        },
        update: {
          status: "FAILED",
          lastError: (err as Error)?.message,
        },
      });
    }
  } catch (error) {
    console.error("[Google Calendar] Error syncing appointment:", error);
  }

  return { patientSynced, doctorSynced };
}

/**
 * Delete Appointment Events from Google Calendars (Cancellations & Rescheduled old events)
 */
export async function deleteAppointmentFromGoogleCalendar(appointmentId: string): Promise<void> {
  try {
    const calendarEvents = await prisma.calendarEvent.findMany({
      where: {
        appointmentId,
        status: { not: "DELETED" },
      },
    });

    for (const event of calendarEvents) {
      if (event.googleEventId && event.googleEventId !== "FAILED") {
        try {
          const client = await getAuthenticatedCalendarClient(event.userId);
          if (client) {
            await client.calendar.events.delete({
              calendarId: "primary",
              eventId: event.googleEventId,
            });
          }
        } catch (err: unknown) {
          const status = (err as { response?: { status?: number } })?.response?.status;
          // 404 / 410 means event is already deleted on Google Calendar
          if (status !== 404 && status !== 410) {
            console.warn(`[Google Calendar] Deletion warning for event [${event.googleEventId}]:`, err);
          }
        }
      }

      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: { status: "DELETED" },
      });
    }
  } catch (error) {
    console.error("[Google Calendar] Error deleting appointment from calendar:", error);
  }
}

/**
 * Disconnect Google Calendar Integration
 */
export async function disconnectGoogleCalendar(userId: string): Promise<boolean> {
  try {
    await prisma.googleCalendarAuth.deleteMany({
      where: { userId },
    });
    return true;
  } catch (error) {
    console.error("[Google Calendar] Error disconnecting calendar:", error);
    return false;
  }
}

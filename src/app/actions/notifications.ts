"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppointmentStatus, EmailStatus } from "@prisma/client";

export interface UserNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "appointment" | "medication" | "queue" | "urgent" | "system";
  href: string;
  createdAt: string;
}

export async function getUserNotificationsAction(): Promise<{
  success: boolean;
  notifications: UserNotification[];
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: true, notifications: [] };
    }

    const userId = session.user.id;
    const role = session.user.role;
    const notifications: UserNotification[] = [];
    const now = new Date();

    if (role === "PATIENT") {
      // Fetch patient's upcoming appointments
      const appointments = await prisma.appointment.findMany({
        where: {
          patientId: userId,
          startTime: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // last 24h & future
          },
          status: {
            not: AppointmentStatus.CANCELLED,
          },
        },
        include: {
          doctor: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      });

      for (const appt of appointments) {
        const docName = appt.doctor.user.name || "Doctor";
        const dateStr = new Date(appt.startTime).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        let description = `Scheduled for ${dateStr}`;
        if (appt.checkedInAt) {
          description = `Checked in on ${dateStr}`;
        } else if (appt.status === AppointmentStatus.COMPLETED) {
          description = `Completed consultation on ${dateStr}`;
        }

        notifications.push({
          id: `appt-${appt.id}`,
          title: `Appointment: Dr. ${docName}`,
          description,
          time: dateStr,
          type: "appointment",
          href: "/patient/appointments",
          createdAt: appt.createdAt.toISOString(),
        });
      }

      // Fetch medication reminders for patient
      const reminders = await prisma.medicationReminder.findMany({
        where: {
          appointment: {
            patientId: userId,
          },
        },
        orderBy: { scheduledFor: "desc" },
        take: 3,
      });

      for (const rem of reminders) {
        const timeStr = new Date(rem.scheduledFor).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });

        notifications.push({
          id: `med-${rem.id}`,
          title: `Medication: ${rem.medicineName}`,
          description: rem.dosage ? `Dosage: ${rem.dosage}` : "Take as prescribed",
          time: timeStr,
          type: "medication",
          href: "/patient/appointments",
          createdAt: rem.createdAt.toISOString(),
        });
      }
    } else if (role === "DOCTOR") {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId },
      });

      if (doctorProfile) {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        const appointments = await prisma.appointment.findMany({
          where: {
            doctorId: doctorProfile.id,
            startTime: {
              gte: todayStart,
              lte: todayEnd,
            },
            status: {
              not: AppointmentStatus.CANCELLED,
            },
          },
          include: {
            patient: {
              select: { name: true },
            },
          },
          orderBy: { startTime: "asc" },
        });

        for (const appt of appointments) {
          const patientName = appt.patient.name || "Patient";
          const timeStr = new Date(appt.startTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });

          // Checked in status
          if (appt.checkedInAt && appt.status === AppointmentStatus.CONFIRMED) {
            notifications.push({
              id: `queue-${appt.id}`,
              title: `${patientName} Checked In`,
              description: `Patient is waiting in queue (${timeStr})`,
              time: timeStr,
              type: "queue",
              href: "/doctor/schedule",
              createdAt: appt.checkedInAt.toISOString(),
            });
          }

          // Urgent summary alert
          const summary = appt.preVisitSummaryJson as any;
          if (summary?.urgency === "High") {
            notifications.push({
              id: `urgent-${appt.id}`,
              title: `High Urgency: ${patientName}`,
              description: summary?.primarySymptom || "Urgent pre-visit summary requires review",
              time: timeStr,
              type: "urgent",
              href: "/doctor/schedule",
              createdAt: appt.createdAt.toISOString(),
            });
          }

          // Regular appointment
          notifications.push({
            id: `doc-appt-${appt.id}`,
            title: `Appointment: ${patientName}`,
            description: `Scheduled at ${timeStr}`,
            time: timeStr,
            type: "appointment",
            href: "/doctor/schedule",
            createdAt: appt.createdAt.toISOString(),
          });
        }
      }
    } else if (role === "ADMIN") {
      // Email delivery issues
      const failedEmails = await prisma.emailLog.findMany({
        where: {
          status: { in: [EmailStatus.FAILED, EmailStatus.DEAD] },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      for (const log of failedEmails) {
        notifications.push({
          id: `email-${log.id}`,
          title: `Email Delivery Alert`,
          description: `Failed to deliver ${log.type} to ${log.toEmail}`,
          time: new Date(log.createdAt).toLocaleDateString(),
          type: "system",
          href: "/admin",
          createdAt: log.createdAt.toISOString(),
        });
      }

      // Recent doctor leaves
      const recentLeaves = await prisma.doctorLeave.findMany({
        include: {
          doctor: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      for (const leave of recentLeaves) {
        const docName = leave.doctor.user.name || "Doctor";
        notifications.push({
          id: `leave-${leave.id}`,
          title: `Doctor Leave Requested`,
          description: `Dr. ${docName} on ${new Date(leave.date).toLocaleDateString()}`,
          time: new Date(leave.createdAt).toLocaleDateString(),
          type: "system",
          href: "/admin/doctors",
          createdAt: leave.createdAt.toISOString(),
        });
      }
    }

    // Sort by createdAt descending and limit top 8
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      success: true,
      notifications: notifications.slice(0, 8),
    };
  } catch (error) {
    console.error("Error loading notifications:", error);
    return { success: false, notifications: [] };
  }
}

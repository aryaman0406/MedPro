"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { disconnectGoogleCalendar } from "@/lib/google-calendar";

export async function getGoogleCalendarStatusAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        isConnected: false,
        needsReauth: false,
      };
    }

    const authRecord = await prisma.googleCalendarAuth.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        connectedEmail: true,
        needsReauth: true,
        updatedAt: true,
      },
    });

    if (!authRecord) {
      return {
        success: true,
        isConnected: false,
        needsReauth: false,
      };
    }

    return {
      success: true,
      isConnected: true,
      connectedEmail: authRecord.connectedEmail || undefined,
      needsReauth: authRecord.needsReauth,
    };
  } catch (error) {
    console.error("Error in getGoogleCalendarStatusAction:", error);
    return {
      success: false,
      isConnected: false,
      needsReauth: false,
      error: (error as Error).message,
    };
  }
}

export async function disconnectGoogleCalendarAction() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized." };
    }

    const success = await disconnectGoogleCalendar(session.user.id);

    revalidatePath("/patient/appointments");
    revalidatePath("/doctor/schedule");
    revalidatePath("/doctor");

    if (success) {
      return {
        success: true,
        message: "Google Calendar disconnected successfully.",
      };
    } else {
      return {
        success: false,
        error: "Failed to disconnect Google Calendar.",
      };
    }
  } catch (error) {
    console.error("Error in disconnectGoogleCalendarAction:", error);
    return {
      success: false,
      error: (error as Error).message || "Failed to disconnect.",
    };
  }
}

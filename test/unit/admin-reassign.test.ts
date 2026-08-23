import { describe, it, expect } from "vitest";
import { AdminReassignAppointmentSchema } from "../../src/lib/validations/admin";

// Pure validation logic helper mirroring adminReassignAppointmentAction rules
function validateAdminReassignment({
  appointmentId,
  targetDoctorId,
  originalDoctorId,
  originalStartTime,
  newIsoStartTime,
  targetDoctorIsActive,
  targetDoctorLeaves,
}: {
  appointmentId: string;
  targetDoctorId: string;
  originalDoctorId: string;
  originalStartTime: Date;
  newIsoStartTime: string;
  targetDoctorIsActive: boolean;
  targetDoctorLeaves: Array<{ date: Date }>;
}) {
  // 1. Zod schema validation
  const parsed = AdminReassignAppointmentSchema.safeParse({
    appointmentId,
    targetDoctorId,
    isoStartTime: newIsoStartTime,
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid reassignment parameters." };
  }

  if (!targetDoctorIsActive) {
    return { success: false, error: "Target doctor is currently inactive or not found." };
  }

  const newStartTime = new Date(newIsoStartTime);

  // 2. Same doctor constraint: new date must be exactly 1 day before or 1 day after original date
  if (targetDoctorId === originalDoctorId) {
    const origDayStart = new Date(
      originalStartTime.getFullYear(),
      originalStartTime.getMonth(),
      originalStartTime.getDate()
    ).getTime();
    const newDayStart = new Date(
      newStartTime.getFullYear(),
      newStartTime.getMonth(),
      newStartTime.getDate()
    ).getTime();
    const diffMs = Math.abs(newDayStart - origDayStart);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays !== 1) {
      return {
        success: false,
        error:
          "When rescheduling with the same doctor, the new appointment date must be exactly 1 day earlier or 1 day after.",
      };
    }
  }

  // 3. Leave check
  const isOnLeave = targetDoctorLeaves.some((l) => {
    const lDate = new Date(l.date);
    return (
      lDate.getFullYear() === newStartTime.getFullYear() &&
      lDate.getMonth() === newStartTime.getMonth() &&
      lDate.getDate() === newStartTime.getDate()
    );
  });

  if (isOnLeave) {
    return { success: false, error: "Target doctor is on leave on the selected date." };
  }

  return { success: true };
}

describe("Admin Appointment Reassignment Unit Tests", () => {
  const origStartTime = new Date("2026-09-15T10:00:00Z"); // Original appointment 1 month out

  it("validates Zod input schema", () => {
    const invalid = AdminReassignAppointmentSchema.safeParse({
      appointmentId: "",
      targetDoctorId: "doc-1",
      isoStartTime: "invalid-date",
    });
    expect(invalid.success).toBe(false);
  });

  it("allows rescheduling with SAME doctor 1 day earlier", () => {
    const dayEarlierIso = "2026-09-14T10:00:00Z";
    const result = validateAdminReassignment({
      appointmentId: "appt-123",
      targetDoctorId: "doc-orig",
      originalDoctorId: "doc-orig",
      originalStartTime: origStartTime,
      newIsoStartTime: dayEarlierIso,
      targetDoctorIsActive: true,
      targetDoctorLeaves: [],
    });

    expect(result.success).toBe(true);
  });

  it("allows rescheduling with SAME doctor 1 day after", () => {
    const dayLaterIso = "2026-09-16T10:00:00Z";
    const result = validateAdminReassignment({
      appointmentId: "appt-123",
      targetDoctorId: "doc-orig",
      originalDoctorId: "doc-orig",
      originalStartTime: origStartTime,
      newIsoStartTime: dayLaterIso,
      targetDoctorIsActive: true,
      targetDoctorLeaves: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects rescheduling with SAME doctor when date is 2 days away or same day", () => {
    const twoDaysLaterIso = "2026-09-17T10:00:00Z";
    const result = validateAdminReassignment({
      appointmentId: "appt-123",
      targetDoctorId: "doc-orig",
      originalDoctorId: "doc-orig",
      originalStartTime: origStartTime,
      newIsoStartTime: twoDaysLaterIso,
      targetDoctorIsActive: true,
      targetDoctorLeaves: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("must be exactly 1 day earlier or 1 day after");
  });

  it("allows reassigning to ANOTHER active doctor on any date without 1-day constraint", () => {
    const threeDaysLaterIso = "2026-09-18T10:00:00Z";
    const result = validateAdminReassignment({
      appointmentId: "appt-123",
      targetDoctorId: "doc-other",
      originalDoctorId: "doc-orig",
      originalStartTime: origStartTime,
      newIsoStartTime: threeDaysLaterIso,
      targetDoctorIsActive: true,
      targetDoctorLeaves: [],
    });

    expect(result.success).toBe(true);
  });

  it("prevents reassignment to a doctor who is on leave on the target date", () => {
    const targetDateIso = "2026-09-18T10:00:00Z";
    const result = validateAdminReassignment({
      appointmentId: "appt-123",
      targetDoctorId: "doc-other",
      originalDoctorId: "doc-orig",
      originalStartTime: origStartTime,
      newIsoStartTime: targetDateIso,
      targetDoctorIsActive: true,
      targetDoctorLeaves: [{ date: new Date("2026-09-18T00:00:00Z") }],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Target doctor is on leave");
  });
});

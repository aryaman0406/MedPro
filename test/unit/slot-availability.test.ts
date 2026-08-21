import { describe, it, expect } from "vitest";
import { format } from "date-fns";

// Pure slot computation helper for testing mathematical schedule boundaries
interface TestDaySchedule {
  isWorking: boolean;
  start: string;
  end: string;
}

interface TestWorkingHours {
  [day: string]: TestDaySchedule;
}

interface TestAppointment {
  startTime: Date;
  endTime: Date;
  status: string;
}

interface TestLeave {
  date: Date;
  reason?: string | null;
}

interface TestHold {
  slotIso: string;
  heldByUserId: string;
  expiresInSeconds: number;
}

function computeSlotsForDay({
  dateString,
  slotDurationMinutes,
  workingHours,
  leaves,
  appointments,
  holds,
  currentUserId,
  mockNow,
}: {
  dateString: string;
  slotDurationMinutes: number;
  workingHours: TestWorkingHours;
  leaves: TestLeave[];
  appointments: TestAppointment[];
  holds: TestHold[];
  currentUserId?: string;
  mockNow?: Date;
}) {
  const [year, month, day] = dateString.split("-").map(Number);
  const targetDateLocal = new Date(year, month - 1, day);
  const now = mockNow || new Date();

  // 1. Check leave
  const isOnLeave = leaves.some((leave) => {
    const l = new Date(leave.date);
    return (
      l.getFullYear() === targetDateLocal.getFullYear() &&
      l.getMonth() === targetDateLocal.getMonth() &&
      l.getDate() === targetDateLocal.getDate()
    );
  });

  if (isOnLeave) {
    return {
      slots: [],
      isOffDuty: false,
      isOnLeave: true,
      leaveReason: "Scheduled Leave",
    };
  }

  // 2. Check weekday operating hours
  const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const weekdayKey = weekdayNames[targetDateLocal.getDay()];
  const daySchedule = workingHours[weekdayKey];

  if (!daySchedule || !daySchedule.isWorking || !daySchedule.start || !daySchedule.end) {
    return {
      slots: [],
      isOffDuty: true,
      isOnLeave: false,
    };
  }

  // 3. Compute slot ranges
  const [startHour, startMin] = daySchedule.start.split(":").map(Number);
  const [endHour, endMin] = daySchedule.end.split(":").map(Number);

  const dayStartDateTime = new Date(year, month - 1, day, startHour, startMin, 0, 0);
  const dayEndDateTime = new Date(year, month - 1, day, endHour, endMin, 0, 0);

  const slots = [];
  let currentSlotStart = new Date(dayStartDateTime);

  while (currentSlotStart.getTime() + slotDurationMinutes * 60 * 1000 <= dayEndDateTime.getTime()) {
    const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMinutes * 60 * 1000);
    const isoStart = currentSlotStart.toISOString();

    const isBooked = appointments.some(
      (appt) =>
        appt.status !== "CANCELLED" &&
        new Date(appt.startTime).getTime() < currentSlotEnd.getTime() &&
        new Date(appt.endTime).getTime() > currentSlotStart.getTime()
    );

    const activeHold = holds.find((h) => h.slotIso === isoStart);
    const isPast = currentSlotStart.getTime() <= now.getTime();

    let status: "AVAILABLE" | "BOOKED" | "HELD_BY_YOU" | "HELD_BY_OTHER" | "PAST" = "AVAILABLE";

    if (isBooked) {
      status = "BOOKED";
    } else if (activeHold) {
      status = currentUserId && activeHold.heldByUserId === currentUserId ? "HELD_BY_YOU" : "HELD_BY_OTHER";
    } else if (isPast) {
      status = "PAST";
    }

    slots.push({
      isoStartTime: isoStart,
      isoEndTime: currentSlotEnd.toISOString(),
      displayTime: format(currentSlotStart, "hh:mm a"),
      status,
    });

    currentSlotStart = new Date(currentSlotStart.getTime() + slotDurationMinutes * 60 * 1000);
  }

  return {
    slots,
    isOffDuty: false,
    isOnLeave: false,
  };
}

describe("Slot Availability Computation Unit Tests", () => {
  const standardWorkingHours: TestWorkingHours = {
    monday: { isWorking: true, start: "09:00", end: "17:00" }, // 8 hours = 480 mins = 16 slots of 30 mins
    tuesday: { isWorking: true, start: "09:00", end: "17:00" },
    wednesday: { isWorking: true, start: "09:00", end: "17:00" },
    thursday: { isWorking: true, start: "09:00", end: "17:00" },
    friday: { isWorking: true, start: "08:00", end: "14:00" }, // 6 hours = 360 mins = 12 slots of 30 mins
    saturday: { isWorking: false, start: "", end: "" },
    sunday: { isWorking: false, start: "", end: "" },
  };

  it("computes exactly 16 available 30-minute slots on a standard working Monday", () => {
    const result = computeSlotsForDay({
      dateString: "2026-08-24", // Monday
      slotDurationMinutes: 30,
      workingHours: standardWorkingHours,
      leaves: [],
      appointments: [],
      holds: [],
      mockNow: new Date("2026-08-24T00:00:00Z"),
    });

    expect(result.isOnLeave).toBe(false);
    expect(result.isOffDuty).toBe(false);
    expect(result.slots.length).toBe(16);
    expect(result.slots[0].displayTime).toBe("09:00 AM");
    expect(result.slots[15].displayTime).toBe("04:30 PM");
    expect(result.slots.every((s) => s.status === "AVAILABLE")).toBe(true);
  });

  it("handles custom Friday working hours (08:00 to 14:00 -> 12 slots)", () => {
    const result = computeSlotsForDay({
      dateString: "2026-08-28", // Friday
      slotDurationMinutes: 30,
      workingHours: standardWorkingHours,
      leaves: [],
      appointments: [],
      holds: [],
      mockNow: new Date("2026-08-28T00:00:00Z"),
    });

    expect(result.slots.length).toBe(12);
    expect(result.slots[0].displayTime).toBe("08:00 AM");
    expect(result.slots[11].displayTime).toBe("01:30 PM");
  });

  it("returns isOffDuty=true with 0 slots on weekend days", () => {
    const result = computeSlotsForDay({
      dateString: "2026-08-30", // Sunday
      slotDurationMinutes: 30,
      workingHours: standardWorkingHours,
      leaves: [],
      appointments: [],
      holds: [],
    });

    expect(result.isOffDuty).toBe(true);
    expect(result.isOnLeave).toBe(false);
    expect(result.slots.length).toBe(0);
  });

  it("returns isOnLeave=true with 0 slots when doctor has a registered leave on that date", () => {
    const result = computeSlotsForDay({
      dateString: "2026-08-25", // Tuesday
      slotDurationMinutes: 30,
      workingHours: standardWorkingHours,
      leaves: [{ date: new Date(2026, 7, 25), reason: "Medical Conference" }],
      appointments: [],
      holds: [],
    });

    expect(result.isOnLeave).toBe(true);
    expect(result.slots.length).toBe(0);
    expect(result.leaveReason).toBe("Scheduled Leave");
  });

  it("correctly subtracts existing booked appointments from available slots", () => {
    const result = computeSlotsForDay({
      dateString: "2026-08-24", // Monday
      slotDurationMinutes: 30,
      workingHours: standardWorkingHours,
      leaves: [],
      appointments: [
        {
          startTime: new Date(2026, 7, 24, 10, 0, 0), // 10:00 AM
          endTime: new Date(2026, 7, 24, 10, 30, 0),
          status: "CONFIRMED",
        },
        {
          startTime: new Date(2026, 7, 24, 14, 0, 0), // 02:00 PM
          endTime: new Date(2026, 7, 24, 14, 30, 0),
          status: "COMPLETED",
        },
        {
          startTime: new Date(2026, 7, 24, 11, 0, 0), // Cancelled does NOT block slot
          endTime: new Date(2026, 7, 24, 11, 30, 0),
          status: "CANCELLED",
        },
      ],
      holds: [],
      mockNow: new Date("2026-08-24T00:00:00Z"),
    });

    const bookedSlots = result.slots.filter((s) => s.status === "BOOKED");
    expect(bookedSlots.length).toBe(2);
    expect(bookedSlots[0].displayTime).toBe("10:00 AM");
    expect(bookedSlots[1].displayTime).toBe("02:00 PM");

    const availableSlots = result.slots.filter((s) => s.status === "AVAILABLE");
    expect(availableSlots.length).toBe(14);
  });

  it("distinguishes HELD_BY_YOU from HELD_BY_OTHER slots based on user session", () => {
    const slot10amIso = new Date(2026, 7, 24, 10, 0, 0).toISOString();
    const slot11amIso = new Date(2026, 7, 24, 11, 0, 0).toISOString();

    const result = computeSlotsForDay({
      dateString: "2026-08-24",
      slotDurationMinutes: 30,
      workingHours: standardWorkingHours,
      leaves: [],
      appointments: [],
      holds: [
        { slotIso: slot10amIso, heldByUserId: "user-patient-1", expiresInSeconds: 240 },
        { slotIso: slot11amIso, heldByUserId: "user-other-patient", expiresInSeconds: 180 },
      ],
      currentUserId: "user-patient-1",
      mockNow: new Date("2026-08-24T00:00:00Z"),
    });

    const heldByMe = result.slots.find((s) => s.displayTime === "10:00 AM");
    const heldByOther = result.slots.find((s) => s.displayTime === "11:00 AM");

    expect(heldByMe?.status).toBe("HELD_BY_YOU");
    expect(heldByOther?.status).toBe("HELD_BY_OTHER");
  });
});

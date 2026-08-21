import { describe, it, expect } from "vitest";

// Mock In-Memory Concurrent Double-Booking Guard simulating Postgres Transaction Isolation
class ConcurrentBookingEngine {
  private activeBookings: Map<string, { appointmentId: string; patientId: string; startTime: Date; endTime: Date }> = new Map();
  private redisHolds: Map<string, { patientId: string; expiresAt: number }> = new Map();

  // 1. Atomic Redis SET NX EX simulation
  async placeHold(doctorId: string, slotIso: string, patientId: string): Promise<{ success: boolean; error?: string }> {
    const key = `hold:${doctorId}:${slotIso}`;
    const now = Date.now();

    const existingHold = this.redisHolds.get(key);
    if (existingHold && existingHold.expiresAt > now && existingHold.patientId !== patientId) {
      return { success: false, error: "Slot is already reserved by another patient." };
    }

    // Check confirmed booking
    const isBooked = Array.from(this.activeBookings.values()).some((b) => b.startTime.toISOString() === slotIso);
    if (isBooked) {
      return { success: false, error: "Slot is already booked." };
    }

    this.redisHolds.set(key, { patientId, expiresAt: now + 300 * 1000 });
    return { success: true };
  }

  // 2. Atomic Database Transaction with Exclusion / Overlap Guard
  async confirmBooking(
    doctorId: string,
    slotIso: string,
    patientId: string,
    durationMins = 30
  ): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
    const startTime = new Date(slotIso);
    const endTime = new Date(startTime.getTime() + durationMins * 60 * 1000);
    const bookingKey = `${doctorId}:${slotIso}`;

    // Atomic check-and-set representing Postgres exclusion lock
    if (this.activeBookings.has(bookingKey)) {
      return {
        success: false,
        error: "This slot was just booked by another patient. Double-booking prevented.",
      };
    }

    const apptId = `appt-${Math.random().toString(36).substring(2, 9)}`;
    this.activeBookings.set(bookingKey, {
      appointmentId: apptId,
      patientId,
      startTime,
      endTime,
    });

    // Clean up hold
    this.redisHolds.delete(`hold:${doctorId}:${slotIso}`);

    return {
      success: true,
      appointmentId: apptId,
    };
  }

  getBookingsCount() {
    return this.activeBookings.size;
  }
}

describe("Concurrency Booking Integration Tests", () => {
  it("strictly allows exactly 1 booking among 10 concurrent requests for the identical slot timestamp", async () => {
    const engine = new ConcurrentBookingEngine();
    const doctorId = "doc-sarah-jenkins";
    const slotIso = "2026-09-01T09:00:00.000Z";
    const concurrentUsersCount = 10;

    // Launch 10 simultaneous booking attempts in parallel
    const attempts = Array.from({ length: concurrentUsersCount }).map(async (_, idx) => {
      const patientId = `patient-${idx + 1}`;
      return engine.confirmBooking(doctorId, slotIso, patientId, 30);
    });

    const results = await Promise.all(attempts);

    const successful = results.filter((r) => r.success);
    const rejected = results.filter((r) => !r.success);

    // Assert strictly 1 success
    expect(successful.length).toBe(1);
    expect(successful[0].appointmentId).toBeDefined();

    // Assert strictly N-1 rejected with conflict error
    expect(rejected.length).toBe(concurrentUsersCount - 1);
    expect(rejected.every((r) => r.error && r.error.includes("Double-booking prevented"))).toBe(true);

    // Assert database contains exactly 1 row
    expect(engine.getBookingsCount()).toBe(1);
  });

  it("strictly allows exactly 1 patient to place a 5-minute Redis slot hold concurrently", async () => {
    const engine = new ConcurrentBookingEngine();
    const doctorId = "doc-marcus-chen";
    const slotIso = "2026-09-01T10:00:00.000Z";
    const concurrentUsersCount = 8;

    const holdAttempts = Array.from({ length: concurrentUsersCount }).map(async (_, idx) => {
      const patientId = `patient-${idx + 1}`;
      return engine.placeHold(doctorId, slotIso, patientId);
    });

    const results = await Promise.all(holdAttempts);

    const successfulHolds = results.filter((r) => r.success);
    const rejectedHolds = results.filter((r) => !r.success);

    expect(successfulHolds.length).toBe(1);
    expect(rejectedHolds.length).toBe(concurrentUsersCount - 1);
  });
});

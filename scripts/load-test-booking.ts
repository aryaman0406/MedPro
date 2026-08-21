import { PrismaClient, Role, AppointmentStatus } from "@prisma/client";
import { setSlotHold, deleteSlotHold } from "../src/lib/redis";

const prisma = new PrismaClient();

interface BookingResult {
  requestId: number;
  patientId: string;
  success: boolean;
  status: "SUCCESS" | "CONFLICT_REJECTED" | "UNHANDLED_ERROR";
  message: string;
  durationMs: number;
}

/**
 * Concurrency Booking Worker
 * Simulates a concurrent patient booking attempt protected by:
 * 1. Redis slot hold
 * 2. PostgreSQL GiST exclusion constraint (or Prisma transaction serialize check)
 */
async function attemptConcurrentBooking(
  requestId: number,
  doctorId: string,
  patientId: string,
  startTime: Date,
  endTime: Date,
  isoStartTime: string
): Promise<BookingResult> {
  const startTimer = Date.now();

  try {
    // 1. Attempt to place Redis hold (atomic SET NX EX)
    const holdAcquired = await setSlotHold(doctorId, isoStartTime, patientId, 30);

    // If hold was not acquired, another concurrent patient won the hold
    if (!holdAcquired) {
      return {
        requestId,
        patientId,
        success: false,
        status: "CONFLICT_REJECTED",
        message: "Slot is currently held by another patient (Redis Lock NX).",
        durationMs: Date.now() - startTimer,
      };
    }

    // 2. Attempt transactional database insert protected by exclusion constraint
    try {
      const appointment = await prisma.$transaction(async (tx) => {
        // Verification query against concurrent inserts
        const existing = await tx.appointment.findFirst({
          where: {
            doctorId,
            status: { notIn: [AppointmentStatus.CANCELLED] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (existing) {
          throw new Error("CONFLICT_SLOT_TAKEN");
        }

        return await tx.appointment.create({
          data: {
            doctorId,
            patientId,
            startTime,
            endTime,
            status: AppointmentStatus.CONFIRMED,
            symptomText: `Load test concurrent request #${requestId}`,
          },
        });
      });

      return {
        requestId,
        patientId,
        success: true,
        status: "SUCCESS",
        message: `Appointment confirmed successfully (ID: ${appointment.id})`,
        durationMs: Date.now() - startTimer,
      };
    } catch (insertError: unknown) {
      const errorMsg = (insertError as Error)?.message || "";
      const prismaCode = (insertError as { code?: string })?.code;

      const isConflict =
        errorMsg.includes("CONFLICT_SLOT_TAKEN") ||
        errorMsg.includes("23P01") ||
        errorMsg.includes("appointments_prevent_overlap") ||
        prismaCode === "P2002" ||
        prismaCode === "P2010";

      if (isConflict) {
        return {
          requestId,
          patientId,
          success: false,
          status: "CONFLICT_REJECTED",
          message: "Sorry, this slot was just booked by someone else (PostgreSQL GiST/Transaction Lock).",
          durationMs: Date.now() - startTimer,
        };
      }

      return {
        requestId,
        patientId,
        success: false,
        status: "UNHANDLED_ERROR",
        message: `Unhandled error: ${errorMsg}`,
        durationMs: Date.now() - startTimer,
      };
    }
  } catch (error) {
    return {
      requestId,
      patientId,
      success: false,
      status: "UNHANDLED_ERROR",
      message: (error as Error).message,
      durationMs: Date.now() - startTimer,
    };
  }
}

async function runLoadTest() {
  console.log("===============================================================");
  console.log("🚀 MEDTRACK PRO: 20 CONCURRENT BOOKING REQUESTS LOAD TEST");
  console.log("===============================================================");

  // 1. Ensure test doctor exists
  let doctor = await prisma.doctorProfile.findFirst({
    include: { user: true },
  });

  if (!doctor) {
    const user = await prisma.user.create({
      data: {
        name: "Dr. Load Test Specialist",
        email: `loadtest.doc.${Date.now()}@medtrack.pro`,
        passwordHash: "hash",
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialization: "Cardiology",
            slotDurationMinutes: 30,
            workingHours: {
              monday: { isWorking: true, start: "09:00", end: "17:00" },
            },
          },
        },
      },
      include: { doctorProfile: { include: { user: true } } },
    });
    doctor = user.doctorProfile!;
  }

  if (!doctor) {
    throw new Error("Unable to locate or create a doctor profile for testing.");
  }

  // 2. Ensure 20 test patients exist
  const patients: Array<{ id: string; name: string }> = [];
  for (let i = 1; i <= 20; i++) {
    const email = `test.patient.${i}@medtrack.pro`;
    let patient = await prisma.user.findUnique({ where: { email } });
    if (!patient) {
      patient = await prisma.user.create({
        data: {
          name: `Patient ${i}`,
          email,
          passwordHash: "hash",
          role: Role.PATIENT,
        },
      });
    }
    patients.push({ id: patient.id, name: patient.name });
  }

  // 3. Define target collision slot
  const testSlotStart = new Date("2026-10-15T10:00:00.000Z");
  const testSlotEnd = new Date("2026-10-15T10:30:00.000Z");
  const isoStartTime = testSlotStart.toISOString();

  // 4. Clean up any previous test state for this exact slot
  await prisma.appointment.deleteMany({
    where: {
      doctorId: doctor.id,
      startTime: testSlotStart,
    },
  });
  await deleteSlotHold(doctor.id, isoStartTime);

  console.log(`\n🎯 Target Doctor: ${doctor.user?.name || doctor.id}`);
  console.log(`📅 Target Slot:   ${isoStartTime} (30 mins)`);
  console.log(`👥 Concurrent Reqs: 20 simultaneous patient requests\n`);

  console.log("⚡ Firing 20 concurrent booking requests simultaneously via Promise.all()...");

  const startTime = Date.now();

  const promises = patients.map((patient, index) =>
    attemptConcurrentBooking(
      index + 1,
      doctor!.id,
      patient.id,
      testSlotStart,
      testSlotEnd,
      isoStartTime
    )
  );

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  console.log("\n---------------------------------------------------------------");
  console.log("📋 DETAILED REQUEST RESULTS LOG:");
  console.log("---------------------------------------------------------------");

  results.forEach((r) => {
    const icon = r.status === "SUCCESS" ? "✅" : r.status === "CONFLICT_REJECTED" ? "🛡️" : "❌";
    console.log(
      `${icon} [Req #${r.requestId.toString().padStart(2, "0")}] Status: ${r.status.padEnd(17)} (${r.durationMs}ms) - ${r.message}`
    );
  });

  const successCount = results.filter((r) => r.status === "SUCCESS").length;
  const conflictCount = results.filter((r) => r.status === "CONFLICT_REJECTED").length;
  const errorCount = results.filter((r) => r.status === "UNHANDLED_ERROR").length;

  console.log("\n===============================================================");
  console.log("📊 CONCURRENCY LOAD-TEST SUMMARY EVIDENCE");
  console.log("===============================================================");
  console.log(`Total Requests Sent:        20`);
  console.log(`Successful Bookings:        ${successCount} (MUST BE EXACTLY 1)`);
  console.log(`Graceful Conflict Rejects:  ${conflictCount} (MUST BE EXACTLY 19)`);
  console.log(`Unhandled 500 Errors:       ${errorCount} (MUST BE 0)`);
  console.log(`Total Execution Time:       ${totalDuration}ms`);
  console.log("===============================================================\n");

  // Verify database state: exactly 1 appointment recorded
  const dbCount = await prisma.appointment.count({
    where: {
      doctorId: doctor.id,
      startTime: testSlotStart,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  console.log(`🔍 Database State Check: Exactly ${dbCount} appointment(s) in DB for this slot.`);

  if (successCount === 1 && conflictCount === 19 && errorCount === 0 && dbCount === 1) {
    console.log("\n🎉 TEST RESULT: PASSED! Zero double-booking concurrency guarantee verified.\n");
  } else {
    console.error("\n❌ TEST RESULT: FAILED! Concurrency assertions violated.\n");
    process.exit(1);
  }
}

runLoadTest()
  .catch((e) => {
    console.error("Test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

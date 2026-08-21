import fs from "fs";
import path from "path";

// Load .env.local for standalone execution
if (typeof process.loadEnvFile === "function") {
  try {
    if (fs.existsSync(path.resolve(process.cwd(), ".env.local"))) {
      process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
    }
  } catch (e) {
    // Ignore if not present
  }
}

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clear existing records if needed (in reverse dependency order)
  await prisma.calendarEvent.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();

  const standardWorkingHours = {
    monday: { isWorking: true, start: "09:00", end: "17:00" },
    tuesday: { isWorking: true, start: "09:00", end: "17:00" },
    wednesday: { isWorking: true, start: "09:00", end: "17:00" },
    thursday: { isWorking: true, start: "09:00", end: "17:00" },
    friday: { isWorking: true, start: "09:00", end: "17:00" },
    saturday: { isWorking: false, start: "", end: "" },
    sunday: { isWorking: false, start: "", end: "" },
  };

  const earlyShiftWorkingHours = {
    monday: { isWorking: true, start: "08:00", end: "16:00" },
    tuesday: { isWorking: true, start: "08:00", end: "16:00" },
    wednesday: { isWorking: true, start: "08:00", end: "16:00" },
    thursday: { isWorking: true, start: "08:00", end: "16:00" },
    friday: { isWorking: true, start: "08:00", end: "14:00" },
    saturday: { isWorking: false, start: "", end: "" },
    sunday: { isWorking: false, start: "", end: "" },
  };

  const lateShiftWorkingHours = {
    monday: { isWorking: true, start: "10:00", end: "18:00" },
    tuesday: { isWorking: true, start: "10:00", end: "18:00" },
    wednesday: { isWorking: true, start: "10:00", end: "18:00" },
    thursday: { isWorking: true, start: "10:00", end: "18:00" },
    friday: { isWorking: true, start: "10:00", end: "18:00" },
    saturday: { isWorking: true, start: "10:00", end: "14:00" },
    sunday: { isWorking: false, start: "", end: "" },
  };

  // 1. Create Admin
  const adminPassword = await bcrypt.hash("AdminPass123!", 10);
  const admin = await prisma.user.create({
    data: {
      name: "MedTrack Admin",
      email: "admin@medtrack.pro",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      phone: "+1-555-0100",
    },
  });
  console.log(`✅ Seeded Admin: ${admin.email} (Password: AdminPass123!)`);

  // 2. Create Doctors
  const doctorPassword = await bcrypt.hash("DoctorPass123!", 10);

  const doctorsData = [
    {
      name: "Dr. Sarah Jenkins",
      email: "sarah.jenkins@medtrack.pro",
      phone: "+1-555-0201",
      specialization: "Cardiology",
      bio: "Board-certified Cardiologist with 12+ years of clinical experience specializing in preventive cardiology, heart rhythm disorders, and hypertension management.",
      slotDurationMinutes: 30,
      workingHours: standardWorkingHours,
    },
    {
      name: "Dr. Marcus Chen",
      email: "marcus.chen@medtrack.pro",
      phone: "+1-555-0202",
      specialization: "Neurology",
      bio: "Senior Neurologist focusing on neurovascular care, migraine therapy, cognitive health, and modern neurological diagnostics.",
      slotDurationMinutes: 45,
      workingHours: earlyShiftWorkingHours,
    },
    {
      name: "Dr. Priya Patel",
      email: "priya.patel@medtrack.pro",
      phone: "+1-555-0203",
      specialization: "Pediatrics",
      bio: "Compassionate Pediatric Specialist dedicated to early childhood wellness, developmental assessments, and comprehensive pediatric care.",
      slotDurationMinutes: 30,
      workingHours: lateShiftWorkingHours,
    },
  ];

  for (const doc of doctorsData) {
    const user = await prisma.user.create({
      data: {
        name: doc.name,
        email: doc.email,
        passwordHash: doctorPassword,
        role: Role.DOCTOR,
        phone: doc.phone,
        doctorProfile: {
          create: {
            specialization: doc.specialization,
            bio: doc.bio,
            slotDurationMinutes: doc.slotDurationMinutes,
            workingHours: doc.workingHours,
            isActive: true,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });
    console.log(`✅ Seeded Doctor: ${user.name} (${doc.specialization}) - ${user.email} (Password: DoctorPass123!)`);
  }

  // 3. Create Patients
  const patientPassword = await bcrypt.hash("PatientPass123!", 10);

  const patientsData = [
    {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1-555-0301",
    },
    {
      name: "Emma Watson",
      email: "emma.watson@example.com",
      phone: "+1-555-0302",
    },
    {
      name: "Alex Rivera",
      email: "alex.rivera@example.com",
      phone: "+1-555-0303",
    },
  ];

  const createdPatients = [];
  for (const pat of patientsData) {
    const user = await prisma.user.create({
      data: {
        name: pat.name,
        email: pat.email,
        passwordHash: patientPassword,
        role: Role.PATIENT,
        phone: pat.phone,
      },
    });
    createdPatients.push(user);
    console.log(`✅ Seeded Patient: ${user.name} - ${user.email} (Password: PatientPass123!)`);
  }

  // 4. Create Varied Historical & Upcoming Appointments for Practice Analytics
  console.log("📊 Seeding rich 30-day appointment history across specialists...");
  const allDoctors = await prisma.doctorProfile.findMany({ include: { user: true } });

  const now = new Date();
  const sampleSymptoms = [
    "Routine cardiovascular health check and resting blood pressure evaluation.",
    "Occasional sharp chest discomfort following moderate aerobic exercise.",
    "Severe throbbing unilateral headache accompanied by sensitivity to light.",
    "Persistent neck stiffness and morning migraine symptoms.",
    "Annual wellness pediatric examination and routine developmental checkup.",
    "Mild dry cough and seasonal allergy symptoms.",
  ];

  // A. Generate Past 30 Days appointments (COMPLETED and NO_SHOW)
  for (let daysAgo = 28; daysAgo >= 1; daysAgo--) {
    const apptDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);

    // Skip Sundays
    if (apptDate.getDay() === 0) continue;

    for (let docIdx = 0; docIdx < allDoctors.length; docIdx++) {
      const doc = allDoctors[docIdx];
      const patient = createdPatients[(daysAgo + docIdx) % createdPatients.length];

      // 1 to 3 appointments per doctor per day
      const count = ((daysAgo * 3 + docIdx) % 3) + 1;

      for (let slotIdx = 0; slotIdx < count; slotIdx++) {
        const startH = 9 + slotIdx * 2;
        const startTime = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate(), startH, 0, 0);
        const endTime = new Date(startTime.getTime() + (doc.slotDurationMinutes || 30) * 60 * 1000);

        // ~15% NO_SHOW rate, otherwise COMPLETED
        const isNoShow = (daysAgo + slotIdx + docIdx) % 7 === 0;

        await prisma.appointment.create({
          data: {
            doctorId: doc.id,
            patientId: patient.id,
            startTime,
            endTime,
            status: isNoShow ? "NO_SHOW" : "COMPLETED",
            symptomText: sampleSymptoms[(daysAgo + slotIdx) % sampleSymptoms.length],
            preVisitSummaryStatus: "COMPLETED",
            preVisitSummaryJson: {
              urgency: isNoShow ? "Low" : slotIdx === 0 ? "High" : "Medium",
              chiefComplaint: isNoShow ? "Follow-up missed" : "Evaluated and treated",
              suggestedQuestions: [
                "How long have symptoms persisted?",
                "Are medications taken consistently?",
                "Any adverse reactions noted?",
              ],
            },
            postVisitNotes: isNoShow
              ? null
              : "Patient examined. Vital signs stable. Treatment plan discussed and prescription issued.",
            postVisitSummaryStatus: isNoShow ? "PENDING" : "COMPLETED",
            postVisitSummaryJson: isNoShow
              ? undefined
              : {
                  plainSummary: "General wellness check completed. Vitals are within normal limits.",
                  medicationSchedule: [
                    { medicine: "Metoprolol 25mg", whenToTake: "Morning with food", durationDays: 30 },
                  ],
                  followUpSteps: ["Return in 3 months for routine monitoring."],
                },
            prescriptionJson: isNoShow
              ? undefined
              : [
                  {
                    medicineName: "Metoprolol",
                    dosage: "25mg",
                    frequencyPerDay: 1,
                    durationDays: 30,
                    instructions: "Take once daily in morning",
                  },
                ],
          },
        });
      }
    }
  }

  // B. Generate Today's & Upcoming Confirmed Appointments
  for (let dayOffset = 0; dayOffset <= 4; dayOffset++) {
    const apptDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
    if (apptDate.getDay() === 0) continue;

    for (let docIdx = 0; docIdx < allDoctors.length; docIdx++) {
      const doc = allDoctors[docIdx];
      const patient = createdPatients[(dayOffset + docIdx) % createdPatients.length];

      const startTime = new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate(), 10 + docIdx * 2, 0, 0);
      const endTime = new Date(startTime.getTime() + (doc.slotDurationMinutes || 30) * 60 * 1000);

      await prisma.appointment.create({
        data: {
          doctorId: doc.id,
          patientId: patient.id,
          startTime,
          endTime,
          status: "CONFIRMED",
          symptomText: sampleSymptoms[docIdx % sampleSymptoms.length],
          preVisitSummaryStatus: "COMPLETED",
          preVisitSummaryJson: {
            urgency: docIdx === 0 ? "High" : "Medium",
            chiefComplaint: "Scheduled consultation",
            suggestedQuestions: ["Review recent laboratory metrics."],
          },
        },
      });
    }
  }

  console.log("🎉 Database seeding completed successfully with full 30-day analytics dataset!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

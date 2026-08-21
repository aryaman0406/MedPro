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
    console.log(`✅ Seeded Patient: ${user.name} - ${user.email} (Password: PatientPass123!)`);
  }

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { z } from "zod";

export const DayScheduleSchema = z.object({
  isWorking: z.boolean(),
  start: z.string().default("09:00"),
  end: z.string().default("17:00"),
});

export type DaySchedule = z.infer<typeof DayScheduleSchema>;

export const WorkingHoursSchema = z.object({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema,
});

export type WorkingHours = z.infer<typeof WorkingHoursSchema>;

export const CreateDoctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  tempPassword: z.string().min(6, "Temporary password must be at least 6 characters.").optional(),
  specialization: z.string().min(2, "Specialization is required."),
  bio: z.string().optional(),
  slotDurationMinutes: z.coerce
    .number()
    .refine((val) => [15, 20, 30, 45, 60].includes(val), {
      message: "Slot duration must be 15, 20, 30, 45, or 60 minutes.",
    }),
  workingHours: WorkingHoursSchema,
});

export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;

export const UpdateDoctorSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required."),
  specialization: z.string().min(2, "Specialization is required."),
  bio: z.string().optional(),
  slotDurationMinutes: z.coerce
    .number()
    .refine((val) => [15, 20, 30, 45, 60].includes(val), {
      message: "Slot duration must be 15, 20, 30, 45, or 60 minutes.",
    }),
  isActive: z.boolean(),
  workingHours: WorkingHoursSchema,
});

export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>;

export const AddDoctorLeaveSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format."),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format.")
    .optional()
    .or(z.literal("")),
  reason: z.string().optional(),
});

export type AddDoctorLeaveInput = z.infer<typeof AddDoctorLeaveSchema>;

export const AdminReassignAppointmentSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required."),
  targetDoctorId: z.string().min(1, "Target doctor ID is required."),
  isoStartTime: z.string().min(1, "ISO start time is required."),
});

export type AdminReassignAppointmentInput = z.infer<typeof AdminReassignAppointmentSchema>;


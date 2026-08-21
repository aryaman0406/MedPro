import { z } from "zod";

export const UrgencyLevelSchema = z.enum(["Low", "Medium", "High"]);
export type UrgencyLevel = z.infer<typeof UrgencyLevelSchema>;

// Pre-visit AI Intake Summary Schema
export const PreVisitSummarySchema = z.object({
  urgency: UrgencyLevelSchema,
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  suggestedQuestions: z.array(z.string().min(1)).min(1, "At least one question required"),
});

export type PreVisitSummaryData = z.infer<typeof PreVisitSummarySchema>;
export type PreVisitSummaryStatus = "PENDING" | "COMPLETED" | "FAILED";

// Structured Prescription Builder Schema
export const PrescriptionItemSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequencyPerDay: z.coerce.number().int().min(1, "Frequency must be at least 1").max(6, "Maximum 6 times per day"),
  durationDays: z.coerce.number().int().min(1, "Duration must be at least 1 day").max(90, "Maximum 90 days"),
  instructions: z.string().optional().default(""),
});

export type PrescriptionItem = z.infer<typeof PrescriptionItemSchema>;

export const CompleteVisitSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required"),
  postVisitNotes: z.string().min(1, "Clinical notes are required"),
  prescriptions: z.array(PrescriptionItemSchema).default([]),
  overrideTimeCheck: z.boolean().optional().default(false),
});

export type CompleteVisitInput = z.infer<typeof CompleteVisitSchema>;

// Post-visit AI Patient-Friendly Summary Schema
export const MedicationScheduleItemSchema = z.object({
  medicine: z.string().min(1),
  whenToTake: z.string().min(1),
  durationDays: z.coerce.number().int().min(1).default(1),
});

export type MedicationScheduleItem = z.infer<typeof MedicationScheduleItemSchema>;

export const PostVisitSummarySchema = z.object({
  plainSummary: z.string().min(1, "Summary is required"),
  medicationSchedule: z.array(MedicationScheduleItemSchema).default([]),
  followUpSteps: z.array(z.string().min(1)).default([]),
});

export type PostVisitSummaryData = z.infer<typeof PostVisitSummarySchema>;
export type PostVisitSummaryStatus = "PENDING" | "COMPLETED" | "FAILED";

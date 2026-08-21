import { z } from "zod";

export const GetSlotsQuerySchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format."),
});

export type GetSlotsQueryInput = z.infer<typeof GetSlotsQuerySchema>;

export const HoldSlotSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required."),
  isoStartTime: z.string().datetime({ message: "Valid ISO 8601 datetime is required." }),
});

export type HoldSlotInput = z.infer<typeof HoldSlotSchema>;

export const ReleaseSlotHoldSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required."),
  isoStartTime: z.string().datetime({ message: "Valid ISO 8601 datetime is required." }),
});

export type ReleaseSlotHoldInput = z.infer<typeof ReleaseSlotHoldSchema>;

export const ConfirmBookingSchema = z.object({
  doctorId: z.string().min(1, "Doctor ID is required."),
  isoStartTime: z.string().datetime({ message: "Valid ISO 8601 datetime is required." }),
  symptomText: z.string().min(3, "Please provide brief description of your symptoms or reason for visit."),
});

export type ConfirmBookingInput = z.infer<typeof ConfirmBookingSchema>;

export type SlotStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "HELD_BY_YOU"
  | "HELD_BY_OTHER"
  | "PAST"
  | "ON_LEAVE";

export interface ComputedSlot {
  isoStartTime: string;
  isoEndTime: string;
  displayTime: string;
  status: SlotStatus;
  holdExpiresInSeconds?: number;
}

import { z } from "zod";

export const RegisterSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number."
    ),
  role: z.enum(["PATIENT", "DOCTOR"], {
    errorMap: () => ({ message: "Role must be either Patient or Doctor." }),
  }),
  phone: z.string().optional(),
  // Doctor-specific fields (optional if PATIENT, required if DOCTOR)
  specialization: z.string().optional(),
  bio: z.string().optional(),
}).refine(
  (data) => {
    if (data.role === "DOCTOR" && (!data.specialization || data.specialization.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Specialization is required for doctors.",
    path: ["specialization"],
  }
);

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof LoginSchema>;

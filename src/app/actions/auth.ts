"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema, type RegisterInput, LoginSchema, type LoginInput } from "@/lib/validations/auth";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { Role } from "@prisma/client";

export type ActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  data?: T;
};

export async function registerUserAction(input: RegisterInput): Promise<ActionResult<{ userId: string; role: Role }>> {
  try {
    const validated = RegisterSchema.safeParse(input);

    if (!validated.success) {
      return {
        success: false,
        error: "Invalid registration details provided.",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { name, email, password, role, phone, specialization, bio } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email address already exists. Please log in instead.",
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const defaultWorkingHours = {
      monday: { isWorking: true, start: "09:00", end: "17:00" },
      tuesday: { isWorking: true, start: "09:00", end: "17:00" },
      wednesday: { isWorking: true, start: "09:00", end: "17:00" },
      thursday: { isWorking: true, start: "09:00", end: "17:00" },
      friday: { isWorking: true, start: "09:00", end: "17:00" },
      saturday: { isWorking: false, start: "", end: "" },
      sunday: { isWorking: false, start: "", end: "" },
    };

    if (role === "DOCTOR") {
      const newUser = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: Role.DOCTOR,
          phone: phone?.trim() || null,
          doctorProfile: {
            create: {
              specialization: specialization || "General Medicine",
              bio: bio?.trim() || null,
              slotDurationMinutes: 30,
              workingHours: defaultWorkingHours,
              isActive: true,
            },
          },
        },
      });

      return {
        success: true,
        message: "Doctor account registered successfully! You can now sign in.",
        data: { userId: newUser.id, role: newUser.role },
      };
    }

    // Default: Patient registration
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: Role.PATIENT,
        phone: phone?.trim() || null,
      },
    });

    return {
      success: true,
      message: "Account created successfully! You can now sign in.",
      data: { userId: newUser.id, role: newUser.role },
    };
  } catch (error) {
    console.error("Error in registerUserAction:", error);
    return {
      success: false,
      error: "An unexpected error occurred during registration. Please try again.",
    };
  }
}

export async function loginUserAction(input: LoginInput): Promise<ActionResult> {
  try {
    const validated = LoginSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        error: "Invalid credentials format.",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    const { email, password } = validated.data;

    await signIn("credentials", {
      email: email.toLowerCase().trim(),
      password,
      redirect: false,
    });

    return {
      success: true,
      message: "Logged in successfully.",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return {
            success: false,
            error: "Invalid email or password.",
          };
        default:
          return {
            success: false,
            error: "Authentication failed. Please check your credentials.",
          };
      }
    }

    // If it's a redirect error from next-auth, rethrow it
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    console.error("Error in loginUserAction:", error);
    return {
      success: false,
      error: "An unexpected error occurred during login. Please try again.",
    };
  }
}

export async function logoutUserAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

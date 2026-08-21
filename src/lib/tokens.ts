import { SignJWT, jwtVerify } from "jose";

export interface RescheduleTokenPayload {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  email: string;
  [key: string]: unknown;
}

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "medtrack_pro_fallback_secret_key_32_bytes_long!";
  return new TextEncoder().encode(secret);
}

/**
 * Generate a cryptographically signed JWT for passwordless rescheduling (7-day validity)
 */
export async function generateRescheduleToken(payload: RescheduleTokenPayload): Promise<string> {
  const secretKey = getJwtSecretKey();

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  return token;
}

/**
 * Verify and decode a magic reschedule token
 */
export async function verifyRescheduleToken(token: string): Promise<RescheduleTokenPayload | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    return {
      appointmentId: payload.appointmentId as string,
      patientId: payload.patientId as string,
      doctorId: payload.doctorId as string,
      email: payload.email as string,
    };
  } catch (err) {
    console.warn("[Magic Token] Token verification failed:", (err as Error).message);
    return null;
  }
}

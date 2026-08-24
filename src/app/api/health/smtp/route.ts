import { NextResponse } from "next/server";
import { verifySmtpConnection } from "@/lib/email/mailer";

/**
 * GET /api/health/smtp
 * Health-check endpoint to verify SMTP connection and credentials.
 * Returns { ok: true } if Gmail/SMTP auth succeeds, or { ok: false, error: "..." } with details.
 */
export async function GET() {
  const result = await verifySmtpConnection();

  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
  });
}

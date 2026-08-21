import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  let returnUrl = "/patient/appointments";
  let userId: string | null = null;

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
      userId = decoded.userId;
      if (decoded.returnUrl) returnUrl = decoded.returnUrl;
    } catch {
      // Fallback
    }
  }

  const redirectUrl = new URL(returnUrl, req.url);

  if (error || !code || !userId) {
    redirectUrl.searchParams.set("calendar_error", error || "authorization_cancelled");
    return NextResponse.redirect(redirectUrl);
  }

  const result = await exchangeCodeForTokens(code, userId);

  if (!result.success) {
    redirectUrl.searchParams.set("calendar_error", result.error || "token_exchange_failed");
  } else {
    redirectUrl.searchParams.set("calendar_status", "connected");
  }

  return NextResponse.redirect(redirectUrl);
}

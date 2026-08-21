import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await auth();

  const searchParams = req.nextUrl.searchParams;
  const returnUrl = searchParams.get("returnUrl") || "/patient/appointments";

  if (!session?.user?.id) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", returnUrl);
    return NextResponse.redirect(loginUrl);
  }

  const authUrl = generateGoogleAuthUrl(session.user.id, returnUrl);
  return NextResponse.redirect(authUrl);
}

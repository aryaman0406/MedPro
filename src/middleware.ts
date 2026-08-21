import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const userRole = session?.user?.role;

  const isPatientRoute = pathname.startsWith("/patient");
  const isDoctorRoute = pathname.startsWith("/doctor");
  const isAdminRoute = pathname.startsWith("/admin");
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // If user is already authenticated and tries to visit /login or /register, redirect to their dashboard
  if (isAuthRoute && session?.user) {
    if (userRole === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    if (userRole === "DOCTOR") {
      return NextResponse.redirect(new URL("/doctor/schedule", req.url));
    }
    return NextResponse.redirect(new URL("/patient/appointments", req.url));
  }

  // Check protected role routes
  if (isPatientRoute || isDoctorRoute || isAdminRoute) {
    // 1. Unauthenticated users
    if (!session?.user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("error", "unauthenticated");
      return NextResponse.redirect(loginUrl);
    }

    // 2. Role-specific protection
    if (isAdminRoute && userRole !== "ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("requiredRole", "ADMIN");
      return NextResponse.redirect(loginUrl);
    }

    if (isDoctorRoute && userRole !== "DOCTOR" && userRole !== "ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("requiredRole", "DOCTOR");
      return NextResponse.redirect(loginUrl);
    }

    if (isPatientRoute && userRole !== "PATIENT" && userRole !== "ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("requiredRole", "PATIENT");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/patient/:path*",
    "/doctor/:path*",
    "/login",
    "/register",
  ],
};

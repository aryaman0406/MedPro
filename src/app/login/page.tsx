"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, AlertCircle, ArrowRight, Check, KeyRound, Loader2, Lock, Mail, ShieldAlert, Sparkles, User, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { loginUserAction } from "@/app/actions/auth";
import { PageTransition } from "@/components/ui/page-transition";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Read URL query errors (e.g. from middleware)
  React.useEffect(() => {
    const error = searchParams.get("error");
    const requiredRole = searchParams.get("requiredRole");

    if (error === "unauthenticated") {
      toast.error("Please sign in to access that protected page.");
    } else if (error === "unauthorized_role") {
      toast.error(
        requiredRole
          ? `Access Denied: You need ${requiredRole} permissions for that area.`
          : "Access Denied: Your account role does not have permission for that page."
      );
    } else if (error === "CredentialsSignin") {
      setErrorMessage("Invalid email or password.");
    }
  }, [searchParams]);

  const handleQuickFill = (demoEmail: string, demoPass: string, label: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    toast.info(`Filled ${label} demo credentials.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginUserAction({ email, password });
      if (!res.success) {
        setErrorMessage(res.error || "Login failed. Please verify your credentials.");
        toast.error(res.error || "Authentication failed.");
      } else {
        toast.success("Welcome back!");
        const callbackUrl = searchParams.get("callbackUrl");
        if (callbackUrl) {
          router.push(callbackUrl);
        } else {
          router.push("/");
          router.refresh();
        }
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to MedTrack Pro</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your appointments and schedule.
          </p>
        </div>

        {/* Quick Fill Demo Bar */}
        <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> 1-Click Demo Fill
            </span>
            <span>Pre-seeded accounts</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono"
              onClick={() => handleQuickFill("admin@medtrack.pro", "AdminPass123!", "Admin")}
            >
              Admin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono"
              onClick={() => handleQuickFill("sarah.jenkins@medtrack.pro", "DoctorPass123!", "Doctor")}
            >
              Doctor
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono"
              onClick={() => handleQuickFill("john.doe@example.com", "PatientPass123!", "Patient")}
            >
              Patient
            </Button>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg">Account Login</CardTitle>
              <CardDescription>
                Sign in with your email and password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-xs font-medium text-destructive border border-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="doctor@medtrack.pro"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Create an account
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </PageTransition>
  );
}

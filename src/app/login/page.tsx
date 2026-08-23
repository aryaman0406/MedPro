"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Activity, AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUserAction } from "@/app/actions/auth";
import { PageTransition } from "@/components/ui/page-transition";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const callbackUrl = searchParams.get("callbackUrl") || "/patient/appointments";
      await signIn("google", { callbackUrl });
    } catch (err) {
      toast.error("Failed to initialize Google authentication.");
      setIsGoogleLoading(false);
    }
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
          window.location.href = callbackUrl;
        } else {
          const role = res.data?.role;
          const normalized = email.toLowerCase().trim();
          if (role === "ADMIN" || normalized.includes("admin")) {
            window.location.href = "/admin";
          } else if (role === "DOCTOR" || normalized.includes("jenkins") || normalized.includes("doctor")) {
            window.location.href = "/doctor/schedule";
          } else {
            window.location.href = "/patient/appointments";
          }
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
            Enter your credentials or continue with Google to access your account.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Account Login</CardTitle>
            <CardDescription>
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-11 border-primary/20 hover:border-primary hover:bg-primary/5 gap-2.5 font-semibold text-xs rounded-xl"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            {/* OR Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <span className="relative bg-card px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Or email &amp; password
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="user@example.com"
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
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
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
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-0">
            <div className="text-center text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                Create an account
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </PageTransition>
  );
}

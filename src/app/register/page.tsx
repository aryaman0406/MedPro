"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Activity, AlertCircle, ArrowRight, Check, Eye, EyeOff, KeyRound, Loader2, Mail, Phone, Stethoscope, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerUserAction } from "@/app/actions/auth";
import { PageTransition } from "@/components/ui/page-transition";

const COMMON_SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "Neurology",
  "Pediatrics",
  "Psychiatry",
  "Orthopedics",
  "Oncology",
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = React.useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [specialization, setSpecialization] = React.useState("General Medicine");
  const [bio, setBio] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      await signIn("google", { callbackUrl: "/patient/appointments" });
    } catch (err) {
      toast.error("Failed to initialize Google registration.");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      const res = await registerUserAction({
        name,
        email,
        phone,
        password,
        role,
        specialization: role === "DOCTOR" ? specialization : undefined,
        bio: role === "DOCTOR" ? bio : undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Registration failed.");
        if (res.fieldErrors) {
          setFieldErrors(res.fieldErrors);
        }
        toast.error(res.error || "Please check your inputs.");
      } else {
        toast.success(res.message || "Registration successful! Please sign in.");
        router.push("/login");
      }
    } catch (err) {
      setErrorMessage("An unexpected error occurred during registration.");
      toast.error("Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create your MedTrack Pro Account</h1>
          <p className="text-sm text-muted-foreground">
            Join the clinical portal as a patient or healthcare provider.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-4 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg">Account Type</CardTitle>
                <CardDescription>Select your role to configure your profile</CardDescription>
              </div>

              {/* Role Selector Tabs */}
              <Tabs
                value={role}
                onValueChange={(val) => setRole(val as "PATIENT" | "DOCTOR")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="PATIENT" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient
                  </TabsTrigger>
                  <TabsTrigger value="DOCTOR" className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    Healthcare Provider
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Google Sign In Button (Patient Context Only) */}
              {role === "PATIENT" && (
                <div className="space-y-3 pb-2 border-b">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignUp}
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
                    Register as Patient with Google
                  </Button>
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <span className="relative bg-card px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Or fill patient form
                    </span>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-3 text-xs font-medium text-destructive border border-destructive/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Common Fields */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder={role === "DOCTOR" ? "Dr. Alex Taylor" : "Alex Taylor"}
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="alex@example.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1-555-0199"
                      className="pl-9"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="text-xs text-destructive">{fieldErrors.phone[0]}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (min 8 chars, 1 uppercase, 1 number)</Label>
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
                {fieldErrors.password && (
                  <p className="text-xs text-destructive">{fieldErrors.password[0]}</p>
                )}
              </div>

              {/* Doctor-Specific Fields */}
              {role === "DOCTOR" && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Primary Specialization</Label>
                    <select
                      id="specialization"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                    >
                      {COMMON_SPECIALIZATIONS.map((spec) => (
                        <option key={spec} value={spec} className="bg-background text-foreground">
                          {spec}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.specialization && (
                      <p className="text-xs text-destructive">{fieldErrors.specialization[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Bio &amp; Clinical Focus</Label>
                    <textarea
                      id="bio"
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Brief overview of clinical credentials, interests, and expertise..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Register as {role === "DOCTOR" ? "Doctor" : "Patient"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </PageTransition>
  );
}

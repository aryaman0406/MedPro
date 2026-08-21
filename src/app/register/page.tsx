"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, AlertCircle, ArrowRight, Check, KeyRound, Loader2, Mail, Phone, Stethoscope, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerUserAction } from "@/app/actions/auth";

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
  const [specialization, setSpecialization] = React.useState("General Medicine");
  const [bio, setBio] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

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
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
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
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
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
    </div>
  );
}

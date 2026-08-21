import Link from "next/link";
import { Activity, ArrowRight, Bot, Calendar, CheckCircle2, Clock, FileCheck, HeartHandshake, Lock, ShieldCheck, Sparkles, Stethoscope, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 lg:pt-28">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur mb-6">
            <Sparkles className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>MedTrack Pro Foundation v1.0 Live</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Intelligent Care Scheduling &amp;{" "}
            <span className="bg-gradient-to-r from-primary via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Clinical Follow-Up
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A comprehensive clinical operations platform unifying patient appointments, doctor availability, automated notifications, and AI-assisted pre-visit summaries.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto text-base h-12 px-8 shadow-md">
              <Link href="/register">
                Book an Appointment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto text-base h-12 px-8">
              <Link href="/login">
                Access Clinical Portal
              </Link>
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t">
            <div className="p-4 rounded-lg bg-card/50 border text-left">
              <div className="text-2xl font-bold text-primary">100%</div>
              <div className="text-xs text-muted-foreground mt-1">Strict Typed Next.js 15</div>
            </div>
            <div className="p-4 rounded-lg bg-card/50 border text-left">
              <div className="text-2xl font-bold text-primary">Auth.js v5</div>
              <div className="text-xs text-muted-foreground mt-1">Role-Protected JWT</div>
            </div>
            <div className="p-4 rounded-lg bg-card/50 border text-left">
              <div className="text-2xl font-bold text-primary">Prisma ORM</div>
              <div className="text-xs text-muted-foreground mt-1">PostgreSQL Schemas</div>
            </div>
            <div className="p-4 rounded-lg bg-card/50 border text-left">
              <div className="text-2xl font-bold text-primary">Mobile 375px</div>
              <div className="text-xs text-muted-foreground mt-1">Dark Mode Native</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-2">Platform Capabilities</Badge>
          <h2 className="text-3xl font-bold tracking-tight">Engineered for Modern Clinical Workflows</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Everything medical practices and patients need for seamless scheduling, intake, and care continuity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden border-border/70 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5" />
              </div>
              <CardTitle>Dynamic Slot Scheduling</CardTitle>
              <CardDescription>
                Doctor-customized working hours, slot durations, and automated calendar synchronization with conflict prevention.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Per-weekday availability windows</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Doctor leave & blackout management</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-border/70 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Bot className="h-5 w-5" />
              </div>
              <CardTitle>AI Pre-Visit Intake</CardTitle>
              <CardDescription>
                Structured symptom collection and AI synthesis so doctors receive a concise clinical briefing before each visit.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Symptom capture & pre-visit summaries</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Structured post-visit clinical notes</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-border/70 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle>Role-Based Security</CardTitle>
              <CardDescription>
                Strict multi-tenant role isolation for Patients, Doctors, and Clinic Admins powered by Auth.js v5.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Edge middleware role enforcement</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                <span>Bcrypt password hashing & JWT sessions</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Seeded Specialists Preview */}
      <section id="specialists" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="outline" className="mb-2">Specialist Network</Badge>
          <h2 className="text-3xl font-bold tracking-tight">Available Medical Specialists</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Board-certified practitioners with active clinic schedules ready for consultations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">Dr. Sarah Jenkins</h3>
                <p className="text-xs text-primary font-medium">Cardiology</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Board-certified Cardiologist specializing in preventive cardiology, rhythm disorders, and hypertension.
            </p>
            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Mon-Fri (9:00 - 17:00)</span>
              <span className="font-mono">30 min slots</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">Dr. Marcus Chen</h3>
                <p className="text-xs text-primary font-medium">Neurology</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Senior Neurologist focusing on neurovascular care, migraine management, and cognitive diagnostics.
            </p>
            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Mon-Fri (8:00 - 16:00)</span>
              <span className="font-mono">45 min slots</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">Dr. Priya Patel</h3>
                <p className="text-xs text-primary font-medium">Pediatrics</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Compassionate Pediatric Specialist dedicated to early childhood wellness and developmental assessments.
            </p>
            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Mon-Sat (10:00 - 18:00)</span>
              <span className="font-mono">30 min slots</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Demo Credentials Quick-Access Box */}
      <section className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="text-center">
            <div className="mx-auto h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-1">
              <Lock className="h-4 w-4" />
            </div>
            <CardTitle className="text-xl">Evaluation &amp; Demo Credentials</CardTitle>
            <CardDescription>
              Test any user role immediately with seeded accounts or register a brand-new patient/doctor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-background border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-destructive">Admin Role</span>
                  <Badge variant="destructive" className="text-[10px]">ADMIN</Badge>
                </div>
                <p className="font-mono text-muted-foreground">admin@medtrack.pro</p>
                <p className="font-mono text-foreground font-semibold">AdminPass123!</p>
              </div>

              <div className="p-3.5 rounded-lg bg-background border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Doctor Role</span>
                  <Badge variant="success" className="text-[10px]">DOCTOR</Badge>
                </div>
                <p className="font-mono text-muted-foreground">sarah.jenkins@medtrack.pro</p>
                <p className="font-mono text-foreground font-semibold">DoctorPass123!</p>
              </div>

              <div className="p-3.5 rounded-lg bg-background border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">Patient Role</span>
                  <Badge variant="secondary" className="text-[10px]">PATIENT</Badge>
                </div>
                <p className="font-mono text-muted-foreground">john.doe@example.com</p>
                <p className="font-mono text-foreground font-semibold">PatientPass123!</p>
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <Button asChild>
                <Link href="/login">Go to Login Page</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/register">Register New User</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

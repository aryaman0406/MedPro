"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  HeartPulse,
  Lock,
  Mail,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";

export default function HomePage() {
  return (
    <PageTransition className="flex flex-col gap-16 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 lg:pt-24">
        {/* Ambient Gradient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-primary/10 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Live System Status Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>MedTrack Pro • Full Clinical Engine Active</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] font-heading">
            Intelligent Care Scheduling &amp;{" "}
            <span className="bg-gradient-to-r from-primary via-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Clinical Follow-Up
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A comprehensive clinical operations suite unifying patient appointment booking, real-time waiting room queues, AI pre-visit intake, and automated medication reminders.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto text-base h-12 px-8 shadow-md gap-2 font-medium">
              <Link href="/patient/find-doctor">
                Book a Consultation
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto text-base h-12 px-8 font-medium">
              <Link href="/login">
                Access Clinical Portal
              </Link>
            </Button>
          </div>

          {/* Platform Capability Highlights Strip */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-8 border-t">
            <div className="p-3.5 rounded-xl bg-card border text-left shadow-2xs">
              <div className="flex items-center gap-1.5 text-primary font-bold text-sm">
                <Sparkles className="h-4 w-4" />
                <span>Google Gemini 2.5</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Pre-Visit Clinical Briefs</div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border text-left shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Radio className="h-4 w-4 animate-pulse" />
                <span>Pusher Channels</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Real-Time Waiting Queue</div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border text-left shadow-2xs">
              <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-bold text-sm">
                <Calendar className="h-4 w-4" />
                <span>Google Calendar</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">2-Way Multi-Party Sync</div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border text-left shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <Mail className="h-4 w-4" />
                <span>Brevo + QStash</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Medication Reminders</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Four Core Features Grid */}
      <section id="features" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="outline" className="mb-2 font-mono text-xs">CLINICAL SUITE</Badge>
          <h2 className="text-3xl font-bold tracking-tight font-heading">Engineered for Modern Practice Workflows</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Everything medical practices, doctors, and patients need for seamless scheduling, intake, and care continuity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Feature 1: Pre-Visit AI Synthesis */}
          <Card className="border-border/70 hover:border-primary/50 transition-all shadow-2xs hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Sparkles className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold">AI Pre-Visit Triage</CardTitle>
              <CardDescription className="text-xs">
                Powered by Gemini 2.5 Flash
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="leading-relaxed">
                Automated symptom analysis extracting urgency level (Low / Medium / High), chief complaints, and 3 diagnostic questions for the physician.
              </p>
              <div className="pt-2 border-t space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Zero-crash graceful fallback</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Post-visit care plans &amp; schedules</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature 2: Real-Time Live Queue */}
          <Card className="border-border/70 hover:border-primary/50 transition-all shadow-2xs hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <Radio className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold">Real-Time Queue</CardTitle>
              <CardDescription className="text-xs">
                Powered by Pusher Channels
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="leading-relaxed">
                Patients check in 30 mins prior to visits. Doctors see a live FIFO waiting room and broadcast &quot;Call Next Patient&quot; with zero page refresh.
              </p>
              <div className="pt-2 border-t space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Live &quot;You are #N in queue&quot; tracker</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span>Instant doctor call notifications</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature 3: Automated Medication Reminders */}
          <Card className="border-border/70 hover:border-primary/50 transition-all shadow-2xs hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                <Mail className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold">Medication Reminders</CardTitle>
              <CardDescription className="text-xs">
                Brevo SMTP + Upstash QStash
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="leading-relaxed">
                Structured prescriptions automatically schedule background adherence emails. Includes leave-conflict magic link rescheduling with 7-day JWTs.
              </p>
              <div className="pt-2 border-t space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>15-minute background cron worker</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span>Dead letter retry dashboard</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feature 4: Google Calendar 2-Way Sync */}
          <Card className="border-border/70 hover:border-primary/50 transition-all shadow-2xs hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2">
                <Calendar className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-bold">Calendar Sync</CardTitle>
              <CardDescription className="text-xs">
                Google OAuth 2.0 Events API
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="leading-relaxed">
                Multi-party calendar synchronization creating tailored events with clinical briefing links on both patient and doctor Google Calendars.
              </p>
              <div className="pt-2 border-t space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                  <span>Automatic cancellation &amp; reschedule sync</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                  <span>Encrypted server token storage</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. Available Specialists Showcase */}
      <section id="specialists" className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="outline" className="mb-2 font-mono text-xs">CLINICAL DIRECTORY</Badge>
          <h2 className="text-3xl font-bold tracking-tight font-heading">Certified Medical Specialists</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Board-certified practitioners with active clinic schedules ready for consultations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Doctor 1: Cardiology */}
          <Card className="p-6 space-y-4 hover:border-primary/40 transition-colors shadow-2xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  SJ
                </div>
                <div>
                  <h3 className="font-bold text-base">Dr. Sarah Jenkins</h3>
                  <p className="text-xs text-primary font-medium">Cardiology Specialist</p>
                </div>
              </div>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Board-certified Cardiologist specializing in preventive cardiology, rhythm disorders, and hypertension management.
            </p>
            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-primary" /> Mon-Fri (9:00 - 17:00)</span>
              <span className="font-mono font-medium text-foreground">30 min</span>
            </div>
            <Button size="sm" asChild className="w-full text-xs">
              <Link href="/patient/find-doctor">Book with Dr. Jenkins</Link>
            </Button>
          </Card>

          {/* Doctor 2: Neurology */}
          <Card className="p-6 space-y-4 hover:border-primary/40 transition-colors shadow-2xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  MC
                </div>
                <div>
                  <h3 className="font-bold text-base">Dr. Marcus Chen</h3>
                  <p className="text-xs text-primary font-medium">Neurology Specialist</p>
                </div>
              </div>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Senior Neurologist focusing on neurovascular care, migraine therapy, cognitive health, and modern diagnostics.
            </p>
            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-primary" /> Mon-Fri (8:00 - 16:00)</span>
              <span className="font-mono font-medium text-foreground">45 min</span>
            </div>
            <Button size="sm" asChild className="w-full text-xs">
              <Link href="/patient/find-doctor">Book with Dr. Chen</Link>
            </Button>
          </Card>

          {/* Doctor 3: Pediatrics */}
          <Card className="p-6 space-y-4 hover:border-primary/40 transition-colors shadow-2xs">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  PP
                </div>
                <div>
                  <h3 className="font-bold text-base">Dr. Priya Patel</h3>
                  <p className="text-xs text-primary font-medium">Pediatric Specialist</p>
                </div>
              </div>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Compassionate Pediatric Specialist dedicated to early childhood wellness, growth milestones, and routine checkups.
            </p>
            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-primary" /> Mon-Sat (10:00 - 18:00)</span>
              <span className="font-mono font-medium text-foreground">30 min</span>
            </div>
            <Button size="sm" asChild className="w-full text-xs">
              <Link href="/patient/find-doctor">Book with Dr. Patel</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* 4. Evaluator Quick-Access Demo Credentials Card */}
      <section className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Card className="border-primary/30 bg-primary/5 shadow-sm">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-1">
              <Lock className="h-4 w-4" />
            </div>
            <CardTitle className="text-xl font-bold font-heading">Evaluator Quick-Access &amp; Demo Credentials</CardTitle>
            <CardDescription className="text-xs">
              Test any role immediately with seeded credentials or register a new patient account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              {/* Admin Card */}
              <div className="p-3.5 rounded-xl bg-background border space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-destructive">Admin Role</span>
                  <Badge variant="destructive" className="text-[10px]">ADMIN</Badge>
                </div>
                <p className="font-mono text-muted-foreground text-[11px] truncate">admin@medtrack.pro</p>
                <p className="font-mono text-foreground font-semibold text-xs">AdminPass123!</p>
                <p className="text-[10px] text-muted-foreground pt-1 border-t">Access practice analytics &amp; doctor rosters</p>
              </div>

              {/* Doctor Card */}
              <div className="p-3.5 rounded-xl bg-background border space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Doctor Role</span>
                  <Badge variant="success" className="text-[10px]">DOCTOR</Badge>
                </div>
                <p className="font-mono text-muted-foreground text-[11px] truncate">sarah.jenkins@medtrack.pro</p>
                <p className="font-mono text-foreground font-semibold text-xs">DoctorPass123!</p>
                <p className="text-[10px] text-muted-foreground pt-1 border-t">View live queue, intake briefs &amp; complete visits</p>
              </div>

              {/* Patient Card */}
              <div className="p-3.5 rounded-xl bg-background border space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">Patient Role</span>
                  <Badge variant="secondary" className="text-[10px]">PATIENT</Badge>
                </div>
                <p className="font-mono text-muted-foreground text-[11px] truncate">john.doe@example.com</p>
                <p className="font-mono text-foreground font-semibold text-xs">PatientPass123!</p>
                <p className="text-[10px] text-muted-foreground pt-1 border-t">Book appointments, check in &amp; view care plans</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button asChild className="w-full sm:w-auto text-xs px-6">
                <Link href="/login">Go to Login Screen</Link>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto text-xs px-6">
                <Link href="/register">Register New Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageTransition>
  );
}

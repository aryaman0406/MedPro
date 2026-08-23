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
import { getPublicDoctorsAction } from "@/app/actions/booking";

export default function HomePage() {
  const [featuredDoctor, setFeaturedDoctor] = React.useState<{
    name: string;
    specialization: string;
    isActive: boolean;
    slotDurationMinutes?: number;
  }>({
    name: "Dr. Sarah Jenkins",
    specialization: "Cardiology Specialist",
    isActive: true,
    slotDurationMinutes: 30,
  });

  React.useEffect(() => {
    async function loadFeaturedDoctor() {
      try {
        const res = await getPublicDoctorsAction();
        if (res.success && res.data && res.data.length > 0) {
          const doc = res.data[0];
          setFeaturedDoctor({
            name: doc.user.name.startsWith("Dr.") ? doc.user.name : `Dr. ${doc.user.name}`,
            specialization: `${doc.specialization} Specialist`,
            isActive: doc.isActive,
            slotDurationMinutes: doc.slotDurationMinutes,
          });
        }
      } catch (err) {
        console.error("Failed to load featured doctor:", err);
      }
    }
    loadFeaturedDoctor();
  }, []);

  return (
    <PageTransition className="flex flex-col gap-16 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-8 md:pt-16 lg:pt-20">
        {/* Ambient Gradient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/10 blur-[140px] rounded-full pointer-events-none -z-10" />

        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Trust Pill Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wider">TRUSTED TELEHEALTH PLATFORM</span>
              </div>

              {/* Main Display Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] font-heading text-foreground">
                Healthcare,{" "}
                <span className="bg-gradient-to-r from-primary via-teal-600 to-emerald-500 bg-clip-text text-transparent block sm:inline">
                  Reimagined
                </span>{" "}
                for the Modern Era.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Skip the waiting room. Consult certified specialists, manage health records securely, and book 24/7 care from the comfort of your home.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Button size="lg" asChild className="w-full sm:w-auto text-sm h-12 px-8 shadow-md gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                  <Link href="/patient/find-doctor">
                    Book Consultation
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto text-sm h-12 px-8 font-semibold rounded-xl">
                  <Link href="/login">
                    Explore Specialists
                  </Link>
                </Button>
              </div>
            </div>

            {/* Hero Right 3D-Style Illustration Panel */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl bg-gradient-to-tr from-primary/20 via-teal-500/10 to-emerald-500/20 p-6 shadow-xl border border-primary/20">
                <div className="space-y-4">
                  {/* Doctor Graphic Card (Dynamically fetched active doctor) */}
                  <div className="rounded-2xl bg-card border p-4 shadow-md flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
                      DR
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground">{featuredDoctor.name}</h4>
                        {featuredDoctor.isActive && (
                          <Badge variant="success" className="text-[10px]">Active Today</Badge>
                        )}
                      </div>
                      <p className="text-xs text-primary font-medium">{featuredDoctor.specialization}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {featuredDoctor.slotDurationMinutes
                          ? `${featuredDoctor.slotDurationMinutes}-min consultations available`
                          : "Accepting consultations"}
                      </p>
                    </div>
                  </div>

                  {/* Calendar Widget Graphic Card */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-card border p-3.5 space-y-1 shadow-sm">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                        <Calendar className="h-4 w-4" />
                        <span>Smart Slots</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">5-Min Hold Lock</p>
                    </div>

                    <div className="rounded-2xl bg-card border p-3.5 space-y-1 shadow-sm">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <HeartPulse className="h-4 w-4" />
                        <span>Real-Time Sync</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Zero Refresh Queue</p>
                    </div>
                  </div>
                </div>
              </div>
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
    </PageTransition>
  );
}

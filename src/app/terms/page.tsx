import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";

export default function TermsOfServicePage() {
  return (
    <PageTransition className="container mx-auto max-w-4xl px-4 py-12 space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </Button>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center gap-2 text-primary font-bold">
            <FileText className="h-6 w-6" />
            <span className="text-xs uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">Terms of Service</span>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight font-heading">
            Terms of Service
          </CardTitle>
          <p className="text-xs text-muted-foreground">Last updated: August 2026</p>
        </CardHeader>

        <CardContent className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By creating an account or scheduling a consultation on MedTrack Pro, patients and medical providers agree to abide by these Terms of Service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Emergency Medical Disclaimer</h2>
            <p>
              MedTrack Pro is an appointment scheduling and telehealth management platform. If you are experiencing a life-threatening medical emergency, call 911 or visit the nearest emergency room immediately.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. Appointment Cancellations &amp; Rescheduling</h2>
            <p>
              Consultations held in the 5-minute atomic slot system can be managed, rescheduled via link, or cancelled through your patient dashboard.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">4. User Account Responsibilities</h2>
            <p>
              Users are responsible for maintaining the confidentiality of their credentials and ensuring accurate symptom details are submitted during pre-visit intake.
            </p>
          </section>
        </CardContent>
      </Card>
    </PageTransition>
  );
}

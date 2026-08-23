import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";

export default function PrivacyPolicyPage() {
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
            <ShieldCheck className="h-6 w-6" />
            <span className="text-xs uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">Legal &amp; Privacy</span>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight font-heading">
            Privacy Policy
          </CardTitle>
          <p className="text-xs text-muted-foreground">Last updated: August 2026</p>
        </CardHeader>

        <CardContent className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. Information We Collect</h2>
            <p>
              MedTrack Pro collects patient consultation details, appointment schedules, physician notes, and intake symptom descriptions strictly required to facilitate digital healthcare visits and clinical follow-ups.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Medical Data Confidentiality</h2>
            <p>
              Your medical intake data, doctor summaries, and prescription records are encrypted end-to-end. We adhere to industry standards and HIPAA-aligned architecture to safeguard protected health information (PHI).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. Third-Party Integrations</h2>
            <p>
              When you opt-in to features such as Google Calendar Sync or transactional SMS/Email reminders, data is securely transmitted via encrypted OAuth 2.0 channels and authenticated API relays without selling or sharing data with unapproved advertisers.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">4. Contact &amp; Data Subject Rights</h2>
            <p>
              Patients and providers may request data access, export, or deletion at any time by contacting our compliance officer at <strong className="text-foreground font-mono">privacy@medtrack.pro</strong>.
            </p>
          </section>
        </CardContent>
      </Card>
    </PageTransition>
  );
}

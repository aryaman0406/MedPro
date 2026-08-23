import React from "react";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";

export default function SecurityOverviewPage() {
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
            <Lock className="h-6 w-6" />
            <span className="text-xs uppercase tracking-wider bg-primary/10 px-3 py-1 rounded-full">Security Architecture</span>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight font-heading">
            Security &amp; Infrastructure Overview
          </CardTitle>
          <p className="text-xs text-muted-foreground">Enterprise-grade clinical security controls</p>
        </CardHeader>

        <CardContent className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">1. Encrypted Storage &amp; Transit</h2>
            <p>
              All application data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Database access is restricted with row-level security and strict role access controls.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">2. Concurrency &amp; Slot Protection</h2>
            <p>
              Appointment booking uses Redis atomic locks with 5-minute time-to-live (TTL) to prevent double-booking collisions during peak scheduling hours.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-foreground">3. Real-Time Communication Security</h2>
            <p>
              Live waiting room queues communicate over encrypted Pusher Channels with channel-level authentication for doctor clinical portals.
            </p>
          </section>
        </CardContent>
      </Card>
    </PageTransition>
  );
}

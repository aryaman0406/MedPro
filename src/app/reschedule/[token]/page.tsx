import Link from "next/link";
import { AlertCircle, ArrowLeft, Calendar, Stethoscope } from "lucide-react";
import { getRescheduleDetailsAction } from "@/app/actions/reschedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MagicRescheduleView } from "@/components/reschedule/magic-reschedule-view";
import { PageTransition } from "@/components/ui/page-transition";

export default async function RescheduleTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const res = await getRescheduleDetailsAction(token);

  if (!res.success || !res.data) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center space-y-6">
        <Card className="border-destructive/30 bg-destructive/[0.02] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold">Reschedule Link Expired or Invalid</CardTitle>
            <CardDescription className="text-xs">
              {res.error || "This magic link has expired or has already been used to reschedule."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Magic reschedule links remain valid for 7 days. If you still need to book or reschedule your consultation, you can log in to your account or browse available specialists directly.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button size="sm" asChild className="w-full sm:w-auto text-xs">
                <Link href="/patient/find-doctor">Browse Available Doctors</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto text-xs">
                <Link href="/login">Sign In to Portal</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const detail = res.data;

  return (
    <PageTransition className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      {/* Top Brand & Context Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
            MP
          </div>
          <span className="font-bold text-sm tracking-tight">MedTrack Pro</span>
        </div>

        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
          <Link href="/patient/find-doctor">
            Browse Other Doctors
          </Link>
        </Button>
      </div>

      <MagicRescheduleView
        token={token}
        patientName={detail.patientName}
        doctorName={detail.doctorName}
        doctorId={detail.doctorId}
        specialization={detail.specialization}
        originalStartTime={detail.originalStartTime}
        symptomText={detail.symptomText}
      />
    </PageTransition>
  );
}

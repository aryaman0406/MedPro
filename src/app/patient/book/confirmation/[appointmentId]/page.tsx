import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Calendar, CheckCircle2, Clock, FileText, Home, Sparkles, Stethoscope, User } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const session = await auth();

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!appointment) {
    notFound();
  }

  const startTimeObj = new Date(appointment.startTime);
  const endTimeObj = new Date(appointment.endTime);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <Card className="border-emerald-500/30 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3 border border-emerald-500/30">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <Badge variant="success" className="mx-auto text-xs uppercase font-bold tracking-wider">
            Booking Confirmed
          </Badge>
          <CardTitle className="text-2xl font-bold tracking-tight mt-2">
            Appointment Confirmed!
          </CardTitle>
          <CardDescription className="text-xs max-w-sm mx-auto">
            Your consultation has been locked in the calendar and protected against duplicate bookings.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Appointment Key Info Box */}
          <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">{appointment.doctor.user.name}</h3>
                <p className="text-xs text-primary font-medium">{appointment.doctor.specialization}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Date</span>
                  <span className="font-semibold">{format(startTimeObj, "EEEE, MMMM do, yyyy")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground block text-[11px]">Time Window</span>
                  <span className="font-mono font-semibold">
                    {format(startTimeObj, "hh:mm a")} - {format(endTimeObj, "hh:mm a")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Symptoms Record */}
          <div className="rounded-xl border p-4 space-y-1.5 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" /> Symptoms &amp; Notes
            </span>
            <p className="text-muted-foreground leading-relaxed italic">
              &quot;{appointment.symptomText}&quot;
            </p>
          </div>

          <div className="rounded-lg bg-primary/5 p-3 flex items-center gap-2 text-xs text-primary border border-primary/20">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              Pre-visit AI intake summary and email confirmations will be processed automatically prior to your consultation.
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button variant="outline" className="w-full sm:w-1/2" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Return Home
            </Link>
          </Button>
          <Button className="w-full sm:w-1/2" asChild>
            <Link href="/patient/appointments">
              <Calendar className="mr-2 h-4 w-4" />
              My Appointments
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

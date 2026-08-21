import Link from "next/link";
import { Calendar, CalendarPlus, Clock, FileText, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PatientAppointmentsPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Appointments</h1>
          <p className="text-sm text-muted-foreground">
            View your upcoming consultations, medical records, and booking history.
          </p>
        </div>
        <Button asChild>
          <Link href="/patient/find-doctor" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Book New Appointment
          </Link>
        </Button>
      </div>

      {/* Empty State / Foundation Preview */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">No Upcoming Appointments</CardTitle>
          <CardDescription className="max-w-sm mt-1 mb-6">
            You don&apos;t have any scheduled appointments yet. Find a certified specialist to book your next consultation.
          </CardDescription>
          <Button asChild>
            <Link href="/patient/find-doctor">Browse Available Doctors</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

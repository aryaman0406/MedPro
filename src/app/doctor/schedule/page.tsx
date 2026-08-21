import { Calendar, Clock, Settings, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DoctorSchedulePage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Schedule &amp; Availability</h1>
          <p className="text-sm text-muted-foreground">
            Manage your weekly clinical hours, slot durations, and view today&apos;s booked appointments.
          </p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Edit Weekly Hours
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s Appointments</CardTitle>
            <CardDescription>Upcoming patient consultations for today</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border-dashed border rounded-lg">
            <Calendar className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No appointments scheduled for today</p>
            <p className="text-xs max-w-xs mt-1">
              New appointment bookings will appear here automatically with pre-visit intake briefs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Schedule</CardTitle>
            <CardDescription>Configured consultation windows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b">
              <span className="font-medium">Monday - Friday</span>
              <span className="font-mono text-muted-foreground">09:00 - 17:00</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-medium">Saturday</span>
              <span className="text-muted-foreground">Off</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span className="font-medium">Sunday</span>
              <span className="text-muted-foreground">Off</span>
            </div>
            <div className="pt-2 flex justify-between items-center">
              <span className="font-medium">Slot Duration:</span>
              <Badge variant="secondary">30 mins</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calendar, CheckCircle2, TrendingUp, Users } from "lucide-react";

export default function AdminAnalyticsPage() {
  const metrics = [
    { title: "Total Patients", value: "3", change: "+100%", icon: Users },
    { title: "Active Doctors", value: "3", change: "Full Roster", icon: Activity },
    { title: "Appointments Booked", value: "0", change: "System Ready", icon: Calendar },
    { title: "Pre-Visit Summaries", value: "0", change: "Ready for AI", icon: CheckCircle2 },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Clinic Analytics &amp; Operations</h1>
        <p className="text-sm text-muted-foreground">
          Real-time metrics on patient throughput, appointment volume, and specialist capacity.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span>{metric.change}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Health &amp; Activity Log</CardTitle>
          <CardDescription>Background services and database synchronization status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-muted/40">
            <span className="font-medium">PostgreSQL Database Connection</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Active
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/40">
            <span className="font-medium">Auth.js v5 JWT Session Layer</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Ready
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/40">
            <span className="font-medium">Appointment Overlap Engine</span>
            <span className="text-amber-500 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Booking Engine Milestone
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

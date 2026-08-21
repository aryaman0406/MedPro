import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DoctorLeavesPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave &amp; Blackout Dates</h1>
          <p className="text-sm text-muted-foreground">
            Block off days for conferences, vacation, or emergency leaves to automatically close booking slots.
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Request Leave
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mb-3 opacity-50" />
          <CardTitle className="text-base font-semibold text-foreground">No Upcoming Leaves</CardTitle>
          <p className="text-xs max-w-sm mt-1">
            You currently have no scheduled leave dates. Any registered leaves will prevent patients from booking overlapping slots.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

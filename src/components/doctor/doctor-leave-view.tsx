"use client";

import * as React from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  Calendar,
  CalendarOff,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestDoctorLeaveAction, deleteDoctorLeaveAction } from "@/app/actions/doctor";
import { PageTransition } from "@/components/ui/page-transition";

interface LeaveItem {
  id: string;
  doctorId: string;
  date: string | Date;
  reason: string | null;
  createdAt: string | Date;
}

interface DoctorLeaveViewProps {
  initialLeaves: LeaveItem[];
  doctorId: string;
}

export function DoctorLeaveView({ initialLeaves, doctorId }: DoctorLeaveViewProps) {
  const [leaves, setLeaves] = React.useState<LeaveItem[]>(initialLeaves);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [startDate, setStartDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await requestDoctorLeaveAction({
        doctorId,
        startDate,
        endDate: endDate || undefined,
        reason: reason.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to submit leave request.");
        toast.error(res.error || "Failed to submit leave request.");
        return;
      }

      toast.success(res.message || "Leave registered successfully!");
      setDialogOpen(false);
      setReason("");
      setEndDate("");

      // Refresh leaves list
      const { getDoctorLeavesAction } = await import("@/app/actions/doctor");
      const refreshRes = await getDoctorLeavesAction();
      if (refreshRes.success && refreshRes.data) {
        setLeaves(refreshRes.data as unknown as LeaveItem[]);
      }
    } catch (err) {
      console.error("Error requesting leave:", err);
      setErrorMsg((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm("Are you sure you want to cancel this leave entry?")) return;

    setDeletingId(leaveId);
    try {
      const res = await deleteDoctorLeaveAction(leaveId);
      if (!res.success) {
        toast.error(res.error || "Failed to remove leave entry.");
        return;
      }

      toast.success("Leave entry removed.");
      setLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    } catch (err) {
      console.error("Error deleting leave:", err);
      toast.error("Failed to remove leave.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageTransition className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
              Availability &amp; Blackout Dates
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Doctor Leave Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Block off unavailable dates. Existing patient bookings on leave dates will automatically be flagged as <span className="font-semibold text-foreground">Needs Reschedule</span>.
          </p>
        </div>

        {/* Request Leave Modal Trigger */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 shadow-xs shrink-0">
              <Plus className="h-4 w-4" />
              Request Leave
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <CalendarOff className="h-5 w-5 text-primary" />
                Request Clinical Leave
              </DialogTitle>
              <DialogDescription className="text-xs">
                Register blackout dates to prevent new bookings and cascade reschedule notices.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRequestLeave} className="space-y-4 py-2">
              {errorMsg && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs font-semibold">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs font-semibold">
                    End Date <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Same day if blank"
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-xs font-semibold">
                  Reason for Leave <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="reason"
                  type="text"
                  placeholder="e.g. Medical conference, Annual leave, Personal emergency"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Automatic Cascade Warning
                </div>
                <p>
                  Any confirmed patient consultations falling on these dates will immediately transition to <strong>NEEDS_RESCHEDULE</strong> status and appear on clinic administrative dashboards.
                </p>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Confirm & Register Leave"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leaves List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Scheduled Leave Dates
              </CardTitle>
              <CardDescription className="text-xs">
                {leaves.length === 1
                  ? "1 registered leave date"
                  : `${leaves.length} registered leave dates`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-dashed border-2 rounded-xl bg-muted/10">
              <Calendar className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm font-semibold text-foreground">No Upcoming Leaves</p>
              <p className="text-xs max-w-sm mt-1">
                You have no scheduled leave days. Click &quot;Request Leave&quot; above to block off days for conferences or time off.
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-xl border overflow-hidden">
              {leaves.map((leave) => {
                const leaveDate = new Date(leave.date);
                const isPast = leaveDate.getTime() < new Date().setHours(0, 0, 0, 0);

                return (
                  <div
                    key={leave.id}
                    className="flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <CalendarOff className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            {format(leaveDate, "EEEE, MMMM do, yyyy")}
                          </span>
                          {isPast && (
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              Past
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          Reason: <span className="font-medium text-foreground">{leave.reason || "Scheduled Clinical Leave"}</span>
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteLeave(leave.id)}
                      disabled={deletingId === leave.id}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      title="Cancel Leave"
                    >
                      {deletingId === leave.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  );
}

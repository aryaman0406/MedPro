"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Pill,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { completeAppointmentVisitAction } from "@/app/actions/doctor";
import { PrescriptionItem } from "@/lib/validations/ai";

interface CompleteVisitDialogProps {
  appointmentId: string;
  patientName: string;
  startTime: string | Date;
  isAlreadyCompleted?: boolean;
}

export function CompleteVisitDialog({
  appointmentId,
  patientName,
  startTime,
  isAlreadyCompleted = false,
}: CompleteVisitDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [clinicalNotes, setClinicalNotes] = React.useState("");
  const [prescriptions, setPrescriptions] = React.useState<PrescriptionItem[]>([
    {
      medicineName: "",
      dosage: "",
      frequencyPerDay: 2,
      durationDays: 5,
      instructions: "",
    },
  ]);
  const [overrideTimeCheck, setOverrideTimeCheck] = React.useState(false);

  const isFuture = new Date(startTime).getTime() > Date.now();

  const handleAddRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        medicineName: "",
        dosage: "",
        frequencyPerDay: 2,
        durationDays: 5,
        instructions: "",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRowChange = (
    index: number,
    field: keyof PrescriptionItem,
    value: string | number
  ) => {
    setPrescriptions((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Filter out empty medication rows
    const validPrescriptions = prescriptions.filter(
      (p) => p.medicineName.trim().length > 0 && p.dosage.trim().length > 0
    );

    if (clinicalNotes.trim().length === 0) {
      setErrorMsg("Please enter clinical notes for this consultation.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await completeAppointmentVisitAction({
        appointmentId,
        postVisitNotes: clinicalNotes.trim(),
        prescriptions: validPrescriptions,
        overrideTimeCheck: isFuture ? overrideTimeCheck : true,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to complete appointment.");
        toast.error(res.error || "Failed to complete appointment.");
        return;
      }

      toast.success(res.message || "Consultation visit successfully completed!");
      setOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error completing visit:", err);
      setErrorMsg((err as Error).message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={
            isAlreadyCompleted
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-2 text-xs"
              : "bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs shadow-xs"
          }
        >
          <CheckCircle2 className="h-4 w-4" />
          {isAlreadyCompleted ? "Update Consultation Notes" : "Complete Visit"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Clinical Encounter Record</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Complete Consultation for {patientName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Document clinical observations, diagnosis, and issue structured prescriptions with automated reminders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {errorMsg && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Time Override Warning */}
          {isFuture && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-800 dark:text-amber-300">
              <div className="font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-600" />
                Scheduled Start Time in Future
              </div>
              <p className="text-[11px] leading-relaxed">
                This consultation was scheduled for a later time. Check below to complete the encounter early.
              </p>
              <label className="flex items-center gap-2 font-medium cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={overrideTimeCheck}
                  onChange={(e) => setOverrideTimeCheck(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span>Override start-time check and complete encounter now</span>
              </label>
            </div>
          )}

          {/* Clinical Notes (Free Text) */}
          <div className="space-y-1.5">
            <Label htmlFor="clinicalNotes" className="text-xs font-bold flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              Clinical Notes &amp; Findings <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="clinicalNotes"
              required
              rows={4}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="e.g. Patient presents with mild viral bronchitis. Lungs clear to auscultation. Advised hydration and rest. Prescribing bronchodilator and symptomatic relief..."
              className="w-full rounded-lg border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
            />
          </div>

          {/* Structured Prescription Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-primary" />
                Prescription &amp; Medication Schedule
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-7 text-[11px] gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Medicine
              </Button>
            </div>

            <div className="space-y-3">
              {prescriptions.map((rx, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border bg-muted/20 p-3.5 space-y-3 relative text-xs"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-semibold text-foreground text-[11px]">
                      Medication #{idx + 1}
                    </span>
                    {prescriptions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRow(idx)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block font-medium">
                        Medicine Name <span className="text-destructive">*</span>
                      </span>
                      <Input
                        placeholder="e.g. Amoxicillin"
                        value={rx.medicineName}
                        onChange={(e) => handleRowChange(idx, "medicineName", e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block font-medium">
                        Dosage <span className="text-destructive">*</span>
                      </span>
                      <Input
                        placeholder="e.g. 500mg or 1 tablet"
                        value={rx.dosage}
                        onChange={(e) => handleRowChange(idx, "dosage", e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block font-medium">
                        Frequency (times / day)
                      </span>
                      <select
                        value={rx.frequencyPerDay}
                        onChange={(e) => handleRowChange(idx, "frequencyPerDay", parseInt(e.target.value, 10))}
                        className="w-full rounded-md border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value={1}>1x daily (Every 24 hours)</option>
                        <option value={2}>2x daily (Every 12 hours)</option>
                        <option value={3}>3x daily (Every 8 hours)</option>
                        <option value={4}>4x daily (Every 6 hours)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] text-muted-foreground block font-medium">
                        Duration (Days)
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={rx.durationDays}
                        onChange={(e) => handleRowChange(idx, "durationDays", parseInt(e.target.value, 10) || 1)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Special Instructions (Optional)
                    </span>
                    <Input
                      placeholder="e.g. Take with food after breakfast & dinner"
                      value={rx.instructions || ""}
                      onChange={(e) => handleRowChange(idx, "instructions", e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Encounter...
                </>
              ) : (
                "Save & Complete Encounter"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

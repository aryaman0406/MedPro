"use client";

import * as React from "react";
import { AlertCircle, Calendar as CalendarIcon, Check, Clock, Loader2, Plus, Save, Stethoscope, Trash2, User, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkingHoursEditor } from "@/components/admin/working-hours-editor";
import { updateDoctorAction, addDoctorLeaveAction, deleteDoctorLeaveAction } from "@/app/actions/admin";
import { WorkingHours } from "@/lib/validations/admin";

export interface DoctorWithProfile {
  id: string; // DoctorProfile ID
  userId: string;
  specialization: string;
  bio?: string | null;
  slotDurationMinutes: number;
  workingHours: WorkingHours;
  isActive: boolean;
  onLeaveToday: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    createdAt: Date | string;
  };
  leaves: Array<{
    id: string;
    doctorId: string;
    date: Date | string;
    reason?: string | null;
    createdAt: Date | string;
  }>;
}

interface DoctorDetailSheetProps {
  doctor: DoctorWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDoctorUpdated: () => void;
}

const COMMON_SPECIALIZATIONS = [
  "Cardiology",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Medicine",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Pediatrics",
  "Psychiatry",
];

export function DoctorDetailSheet({
  doctor,
  open,
  onOpenChange,
  onDoctorUpdated,
}: DoctorDetailSheetProps) {
  const [activeTab, setActiveTab] = React.useState("profile");

  // Profile Edit State
  const [specialization, setSpecialization] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [slotDurationMinutes, setSlotDurationMinutes] = React.useState<number>(30);
  const [isActive, setIsActive] = React.useState<boolean>(true);
  const [workingHours, setWorkingHours] = React.useState<WorkingHours>({
    monday: { isWorking: true, start: "09:00", end: "17:00" },
    tuesday: { isWorking: true, start: "09:00", end: "17:00" },
    wednesday: { isWorking: true, start: "09:00", end: "17:00" },
    thursday: { isWorking: true, start: "09:00", end: "17:00" },
    friday: { isWorking: true, start: "09:00", end: "17:00" },
    saturday: { isWorking: false, start: "09:00", end: "13:00" },
    sunday: { isWorking: false, start: "09:00", end: "13:00" },
  });
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Leave State
  const [leaveStartDate, setLeaveStartDate] = React.useState("");
  const [leaveEndDate, setLeaveEndDate] = React.useState("");
  const [leaveReason, setLeaveReason] = React.useState("");
  const [isAddingLeave, setIsAddingLeave] = React.useState(false);
  const [deletingLeaveId, setDeletingLeaveId] = React.useState<string | null>(null);

  // Sync state when doctor changes
  React.useEffect(() => {
    if (doctor) {
      setSpecialization(doctor.specialization);
      setBio(doctor.bio || "");
      setSlotDurationMinutes(doctor.slotDurationMinutes);
      setIsActive(doctor.isActive);
      setWorkingHours(doctor.workingHours);
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveReason("");
    }
  }, [doctor]);

  if (!doctor) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const res = await updateDoctorAction({
        doctorId: doctor.id,
        specialization,
        bio,
        slotDurationMinutes,
        isActive,
        workingHours,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update profile.");
      } else {
        toast.success("Doctor profile and schedule updated successfully.");
        onDoctorUpdated();
      }
    } catch (err) {
      toast.error("An error occurred while updating profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStartDate) {
      toast.error("Please select a leave date.");
      return;
    }

    setIsAddingLeave(true);

    try {
      const res = await addDoctorLeaveAction({
        doctorId: doctor.id,
        startDate: leaveStartDate,
        endDate: leaveEndDate || undefined,
        reason: leaveReason || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to register leave.");
      } else {
        const count = res.data?.rescheduledCount ?? 0;
        if (count > 0) {
          toast.warning(
            `Leave registered! ${count} existing confirmed appointment(s) now need rescheduling.`,
            { duration: 8000 }
          );
        } else {
          toast.success(res.message || "Leave registered successfully.");
        }

        setLeaveStartDate("");
        setLeaveEndDate("");
        setLeaveReason("");
        onDoctorUpdated();
      }
    } catch (err) {
      toast.error("An error occurred while registering leave.");
    } finally {
      setIsAddingLeave(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    setDeletingLeaveId(leaveId);
    try {
      const res = await deleteDoctorLeaveAction(leaveId);
      if (!res.success) {
        toast.error(res.error || "Failed to delete leave.");
      } else {
        toast.success("Leave entry deleted.");
        onDoctorUpdated();
      }
    } catch (err) {
      toast.error("An error occurred while deleting leave.");
    } finally {
      setDeletingLeaveId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-bold flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                {doctor.user.name}
              </SheetTitle>
              <SheetDescription className="text-xs">
                {doctor.user.email} • {doctor.user.phone || "No phone registered"}
              </SheetDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={doctor.isActive ? "success" : "secondary"}>
                {doctor.isActive ? "Active" : "Inactive"}
              </Badge>
              {doctor.onLeaveToday && (
                <Badge variant="warning" className="text-[10px]">On Leave Today</Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="text-xs">Profile &amp; Schedule</TabsTrigger>
            <TabsTrigger value="leaves" className="text-xs flex items-center gap-1.5">
              <span>Leave Management</span>
              {doctor.leaves.length > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {doctor.leaves.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Profile & Schedule */}
          <TabsContent value="profile" className="space-y-4 pt-4">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <Label htmlFor="status-toggle" className="text-xs font-semibold">
                    Practitioner Status
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Active doctors appear in the patient booking catalog.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium">
                    {isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                  <Switch
                    id="status-toggle"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-spec" className="text-xs">Specialization *</Label>
                  <Select value={specialization} onValueChange={setSpecialization}>
                    <SelectTrigger id="edit-spec" className="text-xs">
                      <SelectValue placeholder="Select Specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SPECIALIZATIONS.map((spec) => (
                        <SelectItem key={spec} value={spec} className="text-xs">
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-slot" className="text-xs">Slot Duration *</Label>
                  <Select
                    value={String(slotDurationMinutes)}
                    onValueChange={(val) => setSlotDurationMinutes(Number(val))}
                  >
                    <SelectTrigger id="edit-slot" className="text-xs">
                      <SelectValue placeholder="Slot duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15" className="text-xs">15 Minutes</SelectItem>
                      <SelectItem value="20" className="text-xs">20 Minutes</SelectItem>
                      <SelectItem value="30" className="text-xs">30 Minutes</SelectItem>
                      <SelectItem value="45" className="text-xs">45 Minutes</SelectItem>
                      <SelectItem value="60" className="text-xs">60 Minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-bio" className="text-xs">Professional Bio</Label>
                <textarea
                  id="edit-bio"
                  rows={2}
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs">Weekly Working Hours Schedule</Label>
                <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full flex items-center gap-2" disabled={isSavingProfile}>
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Profile Changes...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Doctor Profile
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB 2: Leave Management */}
          <TabsContent value="leaves" className="space-y-5 pt-4">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Register Doctor Leave / Blackout
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Blocking dates automatically closes patient booking slots and transitions any overlapping confirmed appointments to <span className="font-semibold text-amber-600 dark:text-amber-400">NEEDS_RESCHEDULE</span> status.
              </p>

              <form onSubmit={handleAddLeave} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="leave-start" className="text-xs">Start Date *</Label>
                    <Input
                      id="leave-start"
                      type="date"
                      className="text-xs font-mono"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="leave-end" className="text-xs">End Date (Optional)</Label>
                    <Input
                      id="leave-end"
                      type="date"
                      className="text-xs font-mono"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      placeholder="Same day if blank"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="leave-reason" className="text-xs">Reason for Absence</Label>
                  <Input
                    id="leave-reason"
                    className="text-xs"
                    placeholder="e.g. Medical Conference, Emergency Leave, Annual Vacation"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                  />
                </div>

                <Button type="submit" size="sm" className="w-full flex items-center gap-1.5" disabled={isAddingLeave}>
                  {isAddingLeave ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Registering &amp; Checking Overlaps...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Add Leave Date(s)
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Registered Leaves List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Scheduled Leave Dates
                </h4>
                <span className="text-xs text-muted-foreground">
                  {doctor.leaves.length} record(s)
                </span>
              </div>

              {doctor.leaves.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No leave dates registered for Dr. {doctor.user.name}.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {doctor.leaves.map((leave) => {
                    const leaveDateObj = new Date(leave.date);
                    return (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs hover:border-border transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold font-mono text-foreground">
                              {format(leaveDateObj, "EEE, MMM dd, yyyy")}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[11px]">
                            {leave.reason || "No reason specified"}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteLeave(leave.id)}
                          disabled={deletingLeaveId === leave.id}
                        >
                          {deletingLeaveId === leave.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

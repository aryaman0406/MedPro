"use client";

import * as React from "react";
import { Check, Copy, Loader2, Plus, Sparkles, Stethoscope, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkingHoursEditor } from "@/components/admin/working-hours-editor";
import { createDoctorAction } from "@/app/actions/admin";
import { WorkingHours } from "@/lib/validations/admin";

interface AddDoctorDialogProps {
  onDoctorAdded?: () => void;
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
  monday: { isWorking: true, start: "09:00", end: "17:00" },
  tuesday: { isWorking: true, start: "09:00", end: "17:00" },
  wednesday: { isWorking: true, start: "09:00", end: "17:00" },
  thursday: { isWorking: true, start: "09:00", end: "17:00" },
  friday: { isWorking: true, start: "09:00", end: "17:00" },
  saturday: { isWorking: false, start: "09:00", end: "13:00" },
  sunday: { isWorking: false, start: "09:00", end: "13:00" },
};

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

export function AddDoctorDialog({ onDoctorAdded }: AddDoctorDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Form State
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [tempPassword, setTempPassword] = React.useState("");
  const [specialization, setSpecialization] = React.useState("General Medicine");
  const [bio, setBio] = React.useState("");
  const [slotDurationMinutes, setSlotDurationMinutes] = React.useState<number>(30);
  const [workingHours, setWorkingHours] = React.useState<WorkingHours>(DEFAULT_WORKING_HOURS);

  // Created Success Modal State (to copy temp password)
  const [createdDoctor, setCreatedDoctor] = React.useState<{
    name: string;
    email: string;
    tempPassword: string;
  } | null>(null);

  const [copied, setCopied] = React.useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setTempPassword("");
    setSpecialization("General Medicine");
    setBio("");
    setSlotDurationMinutes(30);
    setWorkingHours(DEFAULT_WORKING_HOURS);
  };

  const handleCopyPassword = () => {
    if (createdDoctor?.tempPassword) {
      navigator.clipboard.writeText(createdDoctor.tempPassword);
      setCopied(true);
      toast.success("Temporary password copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await createDoctorAction({
        name,
        email,
        phone,
        tempPassword: tempPassword.trim() || undefined,
        specialization,
        bio,
        slotDurationMinutes,
        workingHours,
      });

      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to create doctor account.");
      } else {
        const passwordToShow = res.data.tempPassword;
        setCreatedDoctor({
          name,
          email,
          tempPassword: passwordToShow,
        });

        toast.success(
          `Doctor ${name} registered! Temp password: ${passwordToShow}`,
          {
            duration: 10000,
            action: {
              label: "Copy Password",
              onClick: () => navigator.clipboard.writeText(passwordToShow),
            },
          }
        );

        setOpen(false);
        resetForm();
        onDoctorAdded?.();
      }
    } catch (err) {
      toast.error("An unexpected error occurred while adding doctor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Doctor
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Register New Doctor
            </DialogTitle>
            <DialogDescription>
              Create a provider account with custom slot durations and weekly schedule windows.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="doc-name">Doctor Name *</Label>
                <Input
                  id="doc-name"
                  placeholder="Dr. Elena Rostova"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-email">Email Address *</Label>
                <Input
                  id="doc-email"
                  type="email"
                  placeholder="elena.rostova@medtrack.pro"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="doc-phone">Phone (Optional)</Label>
                <Input
                  id="doc-phone"
                  placeholder="+1-555-0188"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-spec">Specialization *</Label>
                <Select value={specialization} onValueChange={setSpecialization}>
                  <SelectTrigger id="doc-spec">
                    <SelectValue placeholder="Select Specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec} value={spec}>
                        {spec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="doc-slot">Slot Duration *</Label>
                <Select
                  value={String(slotDurationMinutes)}
                  onValueChange={(val) => setSlotDurationMinutes(Number(val))}
                >
                  <SelectTrigger id="doc-slot">
                    <SelectValue placeholder="Slot duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 Minutes</SelectItem>
                    <SelectItem value="20">20 Minutes</SelectItem>
                    <SelectItem value="30">30 Minutes</SelectItem>
                    <SelectItem value="45">45 Minutes</SelectItem>
                    <SelectItem value="60">60 Minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-pass">
                Temporary Password (leave blank for auto-generation)
              </Label>
              <Input
                id="doc-pass"
                type="text"
                placeholder="Auto-generated if empty"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc-bio">Professional Bio &amp; Clinical Focus</Label>
              <textarea
                id="doc-bio"
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Clinical background, board certifications, and areas of interest..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            {/* Working Hours Editor */}
            <div className="space-y-1.5 pt-2">
              <Label>Working Hours &amp; Day Availability</Label>
              <WorkingHoursEditor value={workingHours} onChange={setWorkingHours} />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering Doctor...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Doctor Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Generated Modal */}
      {createdDoctor && (
        <Dialog open={!!createdDoctor} onOpenChange={() => setCreatedDoctor(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="h-5 w-5" />
                Doctor Created Successfully
              </DialogTitle>
              <DialogDescription>
                Share these temporary login credentials with the practitioner.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted p-3 space-y-1 text-xs">
                <p>
                  <span className="font-semibold text-foreground">Doctor:</span> {createdDoctor.name}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Email:</span> {createdDoctor.email}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={createdDoctor.tempPassword}
                    className="font-mono text-sm font-bold tracking-wider bg-muted/50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyPassword}
                    aria-label="Copy password"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setCreatedDoctor(null)} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

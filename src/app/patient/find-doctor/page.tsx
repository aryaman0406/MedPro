"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, ArrowRight, Calendar, Clock, Filter, Loader2, RefreshCw, Search, Stethoscope, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicDoctorsAction } from "@/app/actions/booking";
import { WorkingHours } from "@/lib/validations/admin";

interface DoctorDirectoryItem {
  id: string;
  userId: string;
  specialization: string;
  bio?: string | null;
  slotDurationMinutes: number;
  workingHours: WorkingHours;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
}

export default function FindDoctorPage() {
  const [doctors, setDoctors] = React.useState<DoctorDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSpecialization, setSelectedSpecialization] = React.useState("ALL");

  const fetchDoctors = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getPublicDoctorsAction(searchQuery, selectedSpecialization);
      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to load doctors catalog.");
      } else {
        setDoctors(res.data as unknown as DoctorDirectoryItem[]);
      }
    } catch (err) {
      toast.error("An error occurred while loading doctors.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedSpecialization]);

  React.useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const formatWorkingHours = (hours: WorkingHours) => {
    if (!hours) return "Standard Mon-Fri (09:00 - 17:00)";
    const activeDays = Object.entries(hours).filter(([_, val]) => val?.isWorking);
    if (activeDays.length === 0) return "Schedule unavailable";
    if (activeDays.length === 5 && !hours.saturday?.isWorking && !hours.sunday?.isWorking) {
      return `Mon-Fri: ${hours.monday?.start || "09:00"} - ${hours.monday?.end || "17:00"}`;
    }
    return `${activeDays.length} working days/week`;
  };

  const specializations = [
    "ALL",
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

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Find a Medical Specialist</h1>
          <Badge variant="secondary" className="font-mono text-xs">
            {doctors.length} Available
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse certified practitioners, compare specializations, and select a consultation window.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by doctor name, medical focus, or symptoms..."
              className="pl-9 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
            >
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec === "ALL" ? "All Specializations" : spec}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Stethoscope className="h-12 w-12 mb-3 opacity-50 text-primary" />
            <CardTitle className="text-lg text-foreground">No Specialists Found</CardTitle>
            <CardDescription className="max-w-sm mt-1 mb-4 text-xs">
              No doctors currently match your search criteria. Try selecting another specialization.
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedSpecialization("ALL");
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <Card key={doc.id} className="flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg font-bold">{doc.user.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs font-semibold text-primary border-primary/30">
                      {doc.specialization}
                    </Badge>
                  </div>
                  <Badge variant="success" className="text-[10px]">
                    Available
                  </Badge>
                </div>
                <CardDescription className="pt-2 text-xs leading-relaxed line-clamp-3">
                  {doc.bio || "Board-certified practitioner dedicated to patient-centered clinical care and modern therapy."}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pb-3">
                <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Slot Duration:
                    </span>
                    <span className="font-mono font-semibold text-foreground">
                      {doc.slotDurationMinutes} mins
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Hours:
                    </span>
                    <span className="text-foreground truncate max-w-[150px]">
                      {formatWorkingHours(doc.workingHours)}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <Button className="w-full flex items-center justify-center gap-2" asChild>
                  <Link href={`/patient/book/${doc.id}`}>
                    Book Appointment
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

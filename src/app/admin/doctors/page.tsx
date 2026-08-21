"use client";

import * as React from "react";
import { Activity, Clock, Filter, Loader2, RefreshCw, Search, Stethoscope, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AddDoctorDialog } from "@/components/admin/add-doctor-dialog";
import { DoctorDetailSheet, DoctorWithProfile } from "@/components/admin/doctor-detail-sheet";
import { getDoctorsAction } from "@/app/actions/admin";
import { WorkingHours } from "@/lib/validations/admin";
import { PageTransition } from "@/components/ui/page-transition";

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = React.useState<DoctorWithProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSpecialization, setSelectedSpecialization] = React.useState<string>("ALL");
  const [selectedDoctor, setSelectedDoctor] = React.useState<DoctorWithProfile | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const fetchDoctors = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getDoctorsAction();
      if (!res.success || !res.data) {
        toast.error(res.error || "Failed to load doctors list.");
      } else {
        setDoctors(res.data as DoctorWithProfile[]);
        // If drawer is currently open for a doctor, refresh the selected doctor object
        if (selectedDoctor) {
          const updated = (res.data as DoctorWithProfile[]).find((d) => d.id === selectedDoctor.id);
          if (updated) setSelectedDoctor(updated);
        }
      }
    } catch (err) {
      toast.error("An error occurred while loading doctors.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDoctor]);

  React.useEffect(() => {
    fetchDoctors();
  }, []);

  const formatWorkingHoursSummary = (hours: WorkingHours) => {
    if (!hours) return "Standard Mon-Fri";
    const activeDays = Object.entries(hours).filter(([_, val]) => val?.isWorking);
    if (activeDays.length === 0) return "No active schedule";
    if (activeDays.length === 5 && !hours.saturday?.isWorking && !hours.sunday?.isWorking) {
      return `Mon-Fri: ${hours.monday?.start || "09:00"} - ${hours.monday?.end || "17:00"}`;
    }
    return `${activeDays.length} working days/week`;
  };

  const handleRowClick = (doctor: DoctorWithProfile) => {
    setSelectedDoctor(doctor);
    setSheetOpen(true);
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSpec =
      selectedSpecialization === "ALL" || doc.specialization === selectedSpecialization;

    return matchesSearch && matchesSpec;
  });

  const specializations = ["ALL", ...Array.from(new Set(doctors.map((d) => d.specialization)))];

  return (
    <PageTransition className="container mx-auto max-w-7xl px-4 py-8 space-y-6">
      {/* Header & Add Doctor Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Doctor Management</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {doctors.length} Registered
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Oversee clinical staff profiles, adjust weekly working hours, and manage leave blackout dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDoctors}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AddDoctorDialog onDoctorAdded={fetchDoctors} />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by doctor name, email, or specialization..."
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

      {/* Doctors Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Medical Practitioners Roster</span>
            <span className="text-xs font-normal text-muted-foreground">
              Click any row to open the full detail &amp; leave drawer
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[220px]">Doctor Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Working Hours Summary</TableHead>
                <TableHead className="w-[120px]">Slot Duration</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[130px]">Today&apos;s Status</TableHead>
                <TableHead className="text-right w-[90px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredDoctors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-xs">
                    No medical practitioners found matching your query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDoctors.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => handleRowClick(doc)}
                  >
                    <TableCell className="font-semibold">
                      <div className="flex flex-col">
                        <span className="text-foreground">{doc.user.name}</span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          {doc.user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium text-xs">
                        {doc.specialization}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span>{formatWorkingHoursSummary(doc.workingHours)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {doc.slotDurationMinutes} mins
                    </TableCell>
                    <TableCell>
                      <Badge variant={doc.isActive ? "success" : "secondary"}>
                        {doc.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.onLeaveToday ? (
                        <Badge variant="warning" className="flex items-center gap-1 w-fit text-[11px]">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          On Leave
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit text-[11px] text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Available
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary">
                        Details →
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Doctor Detail Drawer */}
      <DoctorDetailSheet
        doctor={selectedDoctor}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onDoctorUpdated={fetchDoctors}
      />
    </PageTransition>
  );
}

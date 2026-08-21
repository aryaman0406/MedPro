import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { getDoctorScheduleAction } from "@/app/actions/doctor";
import { DoctorScheduleView } from "@/components/doctor/doctor-schedule-view";

export default async function DoctorDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/doctor");
  }

  if (session.user.role !== Role.DOCTOR && session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const res = await getDoctorScheduleAction();

  if (!res.success || !res.data) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-12 text-center">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-destructive">Schedule Unavailable</h2>
          <p className="text-xs text-muted-foreground mt-2">
            {res.error || "Unable to load doctor schedule. Please ensure your account has a doctor profile."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <DoctorScheduleView
        doctorId={res.data.doctorId}
        initialDateString={res.data.dateString}
        doctorName={res.data.doctorName}
        specialization={res.data.specialization}
        appointments={res.data.appointments as any}
        stats={res.data.stats}
      />
    </div>
  );
}

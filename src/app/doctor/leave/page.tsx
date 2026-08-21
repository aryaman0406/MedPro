import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDoctorLeavesAction } from "@/app/actions/doctor";
import { DoctorLeaveView } from "@/components/doctor/doctor-leave-view";

export default async function DoctorLeavePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/doctor/leave");
  }

  if (session.user.role !== Role.DOCTOR && session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { userId: session.user.id },
  });

  const targetDoctorId = doctorProfile?.id || (await prisma.doctorProfile.findFirst())?.id;

  if (!targetDoctorId) {
    redirect("/doctor/schedule");
  }

  const leavesRes = await getDoctorLeavesAction();
  const initialLeaves = leavesRes.success && leavesRes.data ? (leavesRes.data as any) : [];

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <DoctorLeaveView initialLeaves={initialLeaves} doctorId={targetDoctorId} />
    </div>
  );
}

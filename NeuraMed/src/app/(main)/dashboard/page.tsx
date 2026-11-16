import { HomeTopBar } from "@/components/layout/top-bar";
import { DashboardClient } from "./dashboard-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";
import type { ReminderWithMed } from "@/types";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [dbUser, reminders, labReports] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true },
    }),
    prisma.reminder.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.labReport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, fileName: true, hasUrgentValues: true, createdAt: true },
    }),
  ]);

  const remindersList: ReminderWithMed[] = reminders.map((r) => ({
    id: r.id,
    medicationName: r.medicationName,
    dose: r.dose,
    timesPerDay: r.timesPerDay,
    schedule: parseJsonSafe(r.scheduleJson, []),
    foodRule: r.foodRule as ReminderWithMed["foodRule"],
    startDate: r.startDate.toISOString(),
    endDate: r.endDate?.toISOString(),
    status: r.status as ReminderWithMed["status"],
    notificationType: r.notificationType.toLowerCase() as ReminderWithMed["notificationType"],
    notes: r.notes ?? undefined,
  }));

  return (
    <>
      <HomeTopBar name={dbUser?.name ?? undefined} />
      <DashboardClient
        userName={dbUser?.name ?? "Foydalanuvchi"}
        reminders={remindersList}
        recentReports={labReports.map((r) => ({
          id: r.id,
          fileName: r.fileName ?? "Noma'lum fayl",
          hasUrgentValues: r.hasUrgentValues,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}

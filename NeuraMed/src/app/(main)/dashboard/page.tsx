import { HomeTopBar } from "@/components/layout/top-bar";
import { DashboardClient } from "./dashboard-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";
import type { ReminderWithMed } from "@/types";
import { isAIEnabled } from "@/lib/ai";
import { traceSummary } from "@/lib/modules/trace";
import { doctors, doctorById } from "@/lib/modules/connect";
import { loadStock } from "@/lib/modules/stock-db";
import type { PlatformSummary } from "@/components/modules/platform-overview";

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

  const [stock, appts, threads] = await Promise.all([
    loadStock(user.id).catch(() => null),
    prisma.appointment.findMany({ where: { userId: user.id, status: "pending" } }),
    prisma.assistantThread.findMany({ where: { userId: user.id } }),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const next = (appts as any[]).filter((a) => a.date >= today).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
  const nextDoc = next ? doctorById(next.doctorId) : null;
  const tr = traceSummary();
  const platform: PlatformSummary = {
    aiEnabled: isAIEnabled(),
    trace: { total: tr.total, verified: tr.verified, suspicious: tr.suspicious.map((p) => ({ id: p.id, name: p.name })) },
    stock: stock
      ? { total: stock.analysis.counts.total, low: stock.analysis.counts.low, expiring: stock.analysis.counts.expiring, expired: stock.analysis.counts.expired, reorder: stock.analysis.reorder.length }
      : { total: 0, low: 0, expiring: 0, expired: 0, reorder: 0 },
    connect: {
      doctors: doctors.length,
      upcomingCount: appts.length,
      upcoming: next && nextDoc ? { id: next.id, doctor: nextDoc.name, specialty: nextDoc.specialty, date: next.date, time: next.time } : null,
    },
    threads: threads.length,
  };

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
        platform={platform}
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

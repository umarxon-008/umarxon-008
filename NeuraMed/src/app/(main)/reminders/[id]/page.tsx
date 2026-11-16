import { TopBar } from "@/components/layout/top-bar";
import { ReminderDetailClient } from "./detail-client";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe, formatDate } from "@/lib/utils";

export default async function ReminderDetailPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const reminder = await prisma.reminder.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      doseLogs: {
        orderBy: { scheduledAt: "desc" },
        take: 20,
      },
    },
  });

  if (!reminder) notFound();

  return (
    <>
      <TopBar title={reminder.medicationName} showBack backHref="/reminders" />
      <ReminderDetailClient
        reminder={{
          id: reminder.id,
          medicationName: reminder.medicationName,
          dose: reminder.dose,
          timesPerDay: reminder.timesPerDay,
          schedule: parseJsonSafe(reminder.scheduleJson, []),
          foodRule: reminder.foodRule as "ovqat_bilan" | "bosh_qorin" | "ahamiyatsiz",
          startDate: reminder.startDate.toISOString(),
          endDate: reminder.endDate?.toISOString(),
          status: reminder.status as "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED",
          notificationType: reminder.notificationType.toLowerCase() as "push" | "alarm" | "both",
          notes: reminder.notes ?? undefined,
        }}
        logs={reminder.doseLogs.map((l) => ({
          id: l.id,
          reminderId: l.reminderId,
          scheduledAt: l.scheduledAt.toISOString(),
          status: l.status as "TAKEN" | "SKIPPED" | "POSTPONED",
          takenAt: l.takenAt?.toISOString(),
          note: l.note ?? undefined,
        }))}
      />
    </>
  );
}

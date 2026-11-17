import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";
import type { ReminderWithMed } from "@/types";
import { MedicationsHub } from "./medications-hub";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Dorilar") };
}

/** Dorilar: mening dorilarim (eslatmalar bilan), dori qidirish va dorilar mosligi — bitta sahifada. */
export default async function MedicationsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
  });
  const list: ReminderWithMed[] = reminders.map((r) => ({
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
      <TopBar title={t("Dorilar")} />
      <MedicationsHub initialTab={searchParams.tab} reminders={list} />
    </>
  );
}

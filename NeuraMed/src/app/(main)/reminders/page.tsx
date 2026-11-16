import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { RemindersClient } from "./reminders-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";
import type { ReminderWithMed } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function RemindersPage() {
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
      <TopBar
        title={t("Dori eslatmalari")}
        rightSlot={
          <Link href="/reminders/add">
            <Button size="icon" variant="ghost">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        }
      />
      <RemindersClient reminders={list} />
    </>
  );
}

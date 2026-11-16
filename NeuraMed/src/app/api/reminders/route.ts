import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import type { ReminderWithMed } from "@/types";

const createSchema = z.object({
  medicationId: z.string().optional(),
  medicationName: z.string().min(1),
  dose: z.string().min(1),
  timesPerDay: z.number().min(1).max(12),
  schedule: z.array(z.object({ time: z.string(), label: z.string() })),
  foodRule: z.enum(["ovqat_bilan", "bosh_qorin", "ahamiyatsiz"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  notificationType: z.enum(["push", "alarm", "both"]).default("push"),
  notes: z.string().optional(),
});

// GET /api/reminders — list user's reminders
export async function GET() {
  const user = await requireAuth();

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    include: { medication: { select: { id: true, name: true } } },
  });

  const result: ReminderWithMed[] = reminders.map((r) => ({
    id: r.id,
    medicationName: r.medicationName,
    dose: r.dose,
    timesPerDay: r.timesPerDay,
    schedule: JSON.parse(r.scheduleJson),
    foodRule: r.foodRule as ReminderWithMed["foodRule"],
    startDate: r.startDate.toISOString(),
    endDate: r.endDate?.toISOString(),
    status: r.status as ReminderWithMed["status"],
    notificationType: r.notificationType.toLowerCase() as ReminderWithMed["notificationType"],
    notes: r.notes ?? undefined,
  }));

  return NextResponse.json({ data: result });
}

// POST /api/reminders — create reminder
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json();
  const data = createSchema.parse(body);

  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      medicationId: data.medicationId,
      medicationName: data.medicationName,
      dose: data.dose,
      timesPerDay: data.timesPerDay,
      scheduleJson: JSON.stringify(data.schedule),
      foodRule: data.foodRule,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      notificationType: data.notificationType.toUpperCase() as "PUSH" | "ALARM" | "BOTH",
      notes: data.notes,
    },
  });

  return NextResponse.json({ data: { id: reminder.id } }, { status: 201 });
}

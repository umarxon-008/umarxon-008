import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  dose: z.string().optional(),
  timesPerDay: z.number().optional(),
  schedule: z.array(z.object({ time: z.string(), label: z.string() })).optional(),
  foodRule: z.string().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

const doseLogSchema = z.object({
  action: z.literal("log"),
  scheduledAt: z.string(),
  status: z.enum(["TAKEN", "SKIPPED", "POSTPONED"]),
  note: z.string().optional(),
});

// GET /api/reminders/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();

  const reminder = await prisma.reminder.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      doseLogs: {
        orderBy: { scheduledAt: "desc" },
        take: 30,
      },
    },
  });

  if (!reminder) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  return NextResponse.json({ data: reminder });
}

// PATCH /api/reminders/[id] — update or log dose
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  const body = await req.json();

  // Check ownership
  const reminder = await prisma.reminder.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!reminder) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  // Dose log action
  if (body.action === "log") {
    const data = doseLogSchema.parse(body);
    const log = await prisma.doseLog.create({
      data: {
        reminderId: params.id,
        scheduledAt: new Date(data.scheduledAt),
        status: data.status,
        takenAt: data.status === "TAKEN" ? new Date() : undefined,
        note: data.note,
      },
    });
    return NextResponse.json({ data: log });
  }

  // Update reminder
  const data = updateSchema.parse(body);
  const updated = await prisma.reminder.update({
    where: { id: params.id },
    data: {
      status: data.status,
      dose: data.dose,
      timesPerDay: data.timesPerDay,
      scheduleJson: data.schedule ? JSON.stringify(data.schedule) : undefined,
      foodRule: data.foodRule,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      notes: data.notes,
    },
  });

  return NextResponse.json({ data: updated });
}

// DELETE /api/reminders/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();

  await prisma.reminder.updateMany({
    where: { id: params.id, userId: user.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}

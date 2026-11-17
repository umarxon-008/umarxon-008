/** Shifokor: o'ziga yozilgan bemorlar va bugungi/yaqin qabullar. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/auth";
import { apiError } from "@/lib/modules/http";
import { patientsOf } from "@/lib/modules/doctors";
import { isoDay } from "@/lib/modules/dates";

export async function GET() {
  try {
    const doc = await requireDoctor();
    const patients = await patientsOf(doc.doctorRef);
    const today = isoDay(new Date());
    const appts: any[] = await prisma.appointment.findMany({ where: { doctorId: doc.doctorRef } });
    const names = new Map(patients.map((p) => [p.id, p.name]));
    const upcoming = appts
      .filter((a) => a.status !== "cancelled" && a.date >= today)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .map((a) => ({ id: a.id, patientId: a.userId, patientName: names.get(a.userId) || a.name, date: a.date, time: a.time, reason: a.reason ?? null, shared: a.shareAccess !== false }));
    const unread: any[] = await prisma.doctorMessage.findMany({ where: { doctorId: doc.doctorRef, sender: "me", read: false } });
    return NextResponse.json({ patients, upcoming, today, unread: unread.length });
  } catch (e) { return apiError(e); }
}

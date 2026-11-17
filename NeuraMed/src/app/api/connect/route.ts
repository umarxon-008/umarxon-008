/** MEDCONNECT: GET /api/connect — shifokorlar (namunaviy + ro'yxatdan o'tganlar) va muassasalar, eng yaqin bo'sh vaqt bilan. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { clinics, slotsFor } from "@/lib/modules/connect";
import { getDoctors } from "@/lib/modules/doctors";
import { apiError } from "@/lib/modules/http";

export async function GET() {
  try {
    await requireAuth();
    const booked = await prisma.appointment.findMany({ where: { status: "pending" } });
    const data = (await getDoctors()).map((d) => {
      const taken = booked.filter((a: any) => a.doctorId === d.id);
      const first = slotsFor(d, taken, 1)[0];
      const slot = first?.slots.find((s) => s.free);
      return { ...d, clinic: clinics.find((c) => c.id === d.clinicId), nextFree: first && slot ? { date: first.date, time: slot.time } : null };
    });
    return NextResponse.json({ doctors: data, clinics, demo: true });
  } catch (e) { return apiError(e); }
}

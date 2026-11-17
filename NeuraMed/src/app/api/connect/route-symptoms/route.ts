/** MEDCONNECT: belgilar bo'yicha mutaxassis tavsiyasi + mos shifokorlarning eng yaqin bo'sh vaqti. Tashxis emas. */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { routeSymptoms } from "@/lib/modules/symptoms";
import { assessMessage } from "@/lib/medai";
import { doctors, slotsFor } from "@/lib/modules/connect";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const b = await readJson(req);
    const text = typeof b?.text === "string" ? b.text.trim().slice(0, 500) : "";
    if (text.length < 3) throw new HttpError(400, "Belgilaringizni bir necha soʻz bilan yozing");
    const r = routeSymptoms(text);
    const booked = await prisma.appointment.findMany({ where: { status: "pending" } });
    const matches = doctors.filter((d) => d.specialty === r.specialty).map((d) => {
      const first = slotsFor(d, booked.filter((a: any) => a.doctorId === d.id) as any, 1)[0];
      const slot = first?.slots.find((s) => s.free);
      return { id: d.id, name: d.name, specialty: d.specialty, nextFree: first && slot ? { date: first.date, time: slot.time } : null };
    });
    return NextResponse.json({ ...r, emergency: assessMessage(text).emergency, doctors: matches });
  } catch (e) { return apiError(e); }
}

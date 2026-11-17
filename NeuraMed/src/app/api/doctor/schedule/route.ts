/** Shifokor ish jadvali: GET; PATCH { workDays: number[], hours: [from, to] } — MEDCONNECT dagi bo'sh vaqtlar shundan hisoblanadi. */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/auth";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { findDoctor } from "@/lib/modules/doctors";

export async function GET() {
  try {
    const doc = await requireDoctor();
    const d = await findDoctor(doc.doctorRef);
    const u: any = await prisma.user.findUnique({ where: { id: doc.id } });
    return NextResponse.json({ workDays: d?.workDays ?? [1, 2, 3, 4, 5], hours: d?.hours ?? [9, 17], specialty: u?.specialty ?? d?.specialty ?? "", clinicName: u?.clinicName ?? "", licenseNo: u?.licenseNo ?? "", verified: false });
  } catch (e) { return apiError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const doc = await requireDoctor();
    const b = await readJson(req);
    const days = Array.isArray(b?.workDays) ? Array.from(new Set(b.workDays.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 6))) : [];
    const from = Number(b?.hours?.[0]); const to = Number(b?.hours?.[1]);
    if (!days.length) throw new HttpError(400, "Kamida bitta ish kunini tanlang");
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 6 || to > 22 || from >= to) throw new HttpError(400, "Ish vaqtini toʻgʻri kiriting (masalan 9–17)");
    await prisma.user.update({ where: { id: doc.id }, data: { workDaysJson: JSON.stringify(days.sort()), workHoursJson: JSON.stringify([from, to]) } });
    return NextResponse.json({ ok: true, workDays: days, hours: [from, to] });
  } catch (e) { return apiError(e); }
}

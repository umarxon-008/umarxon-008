/** Qabulga yozilish (DEMO: real qabul belgilanmaydi, shifokorga xabar yuborilmaydi). */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { doctorById, slotsFor } from "@/lib/modules/connect";
import { apiError, HttpError, readJson } from "@/lib/modules/http";

export async function GET() {
  try {
    const user = await requireAuth();
    const list = await prisma.appointment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data: list });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const b = await readJson(req);
    const doc = doctorById(String(b?.doctorId || ""));
    if (!doc) throw new HttpError(400, "Shifokorni tanlang");
    const date = String(b?.date || ""); const time = String(b?.time || "");
    const name = typeof b?.name === "string" ? b.name.trim() : "";
    const phone = typeof b?.phone === "string" ? b.phone.trim() : "";
    if (!/^[\p{L}\s'ʻʼ’-]{2,40}$/u.test(name)) throw new HttpError(400, "Ismingizni kiriting (2–40 harf)");
    if (phone && !/^\+?[\d\s()-]{9,17}$/.test(phone)) throw new HttpError(400, "Telefon raqami formati notoʻgʻri");
    const taken = await prisma.appointment.findMany({ where: { doctorId: doc.id, status: "pending" } });
    const ok = slotsFor(doc, taken as any).some((d) => d.date === date && d.slots.some((s) => s.time === time && s.free));
    if (!ok) throw new HttpError(409, "Bu vaqt band yoki mavjud emas. Boshqa vaqtni tanlang.");
    const a = await prisma.appointment.create({
      data: { userId: user.id, doctorId: doc.id, date, time, name, phone: phone || null, reason: typeof b?.reason === "string" ? b.reason.trim().slice(0, 200) : null, status: "pending" },
    });
    return NextResponse.json({ data: a, demo: true });
  } catch (e) { return apiError(e); }
}

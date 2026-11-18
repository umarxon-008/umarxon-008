/** Bemor chati: shifokor hisobi bo'lsa — haqiqiy shifokor javob beradi; namunaviy shifokorda — avtomatik demo javob. */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";
import { demoReplies } from "@/lib/modules/connect";
import { accountForRef, findDoctor } from "@/lib/modules/doctors";
import { assessMessage } from "@/lib/medai";
import { apiError, HttpError, readJson } from "@/lib/modules/http";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePatient();
    const doctorId = req.nextUrl.searchParams.get("doctorId");
    if (!doctorId) {
      const all = await prisma.doctorMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
      const unread: Record<string, number> = {};
      all.forEach((m: any) => { if (m.sender === "doctor" && !m.read) unread[m.doctorId] = (unread[m.doctorId] || 0) + 1; });
      return NextResponse.json({ unread });
    }
    if (!(await findDoctor(doctorId))) throw new HttpError(404, "Shifokor topilmadi");
    await prisma.doctorMessage.updateMany({ where: { userId: user.id, doctorId, sender: "doctor" }, data: { read: true } });
    const list = await prisma.doctorMessage.findMany({ where: { userId: user.id, doctorId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ data: list, live: !!(await accountForRef(doctorId)) });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePatient();
    const b = await readJson(req);
    const doc = await findDoctor(String(b?.doctorId || ""));
    if (!doc) throw new HttpError(400, "Shifokor topilmadi");
    const text = typeof b?.text === "string" ? b.text.trim() : "";
    if (!text) throw new HttpError(400, "Xabar boʻsh");
    if (text.length > 500) throw new HttpError(400, "Xabar 500 belgidan oshmasligi kerak");
    const booked: any[] = await prisma.appointment.findMany({ where: { userId: user.id, doctorId: doc.id } });
    if (!booked.some((a) => a.status !== "cancelled")) throw new HttpError(403, "Shifokorga yozish uchun avval qabulga yoziling");
    const live = !!(await accountForRef(doc.id));
    await prisma.doctorMessage.create({ data: { userId: user.id, doctorId: doc.id, sender: "me", text, read: !live } });
    if (live) return NextResponse.json({ reply: null, live: true, flags: assessMessage(text), demo: false });
    const prev = await prisma.doctorMessage.findMany({ where: { userId: user.id, doctorId: doc.id, sender: "doctor" } });
    const reply = await prisma.doctorMessage.create({
      data: { userId: user.id, doctorId: doc.id, sender: "doctor", text: demoReplies[prev.length % demoReplies.length], read: true },
    });
    return NextResponse.json({ reply, live: false, flags: assessMessage(text), demo: true });
  } catch (e) { return apiError(e); }
}

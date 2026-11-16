/** Shifokor bilan demo chat: javoblar avtomatik (haqiqiy shifokor emas). */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { doctorById, demoReplies } from "@/lib/modules/connect";
import { assessMessage } from "@/lib/medai";
import { apiError, HttpError, readJson } from "@/lib/modules/http";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const doctorId = req.nextUrl.searchParams.get("doctorId");
    if (!doctorId) {
      const all = await prisma.doctorMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
      const unread: Record<string, number> = {};
      all.forEach((m: any) => { if (m.sender === "doctor" && !m.read) unread[m.doctorId] = (unread[m.doctorId] || 0) + 1; });
      return NextResponse.json({ unread });
    }
    if (!doctorById(doctorId)) throw new HttpError(404, "Shifokor topilmadi");
    await prisma.doctorMessage.updateMany({ where: { userId: user.id, doctorId, sender: "doctor" }, data: { read: true } });
    const list = await prisma.doctorMessage.findMany({ where: { userId: user.id, doctorId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ data: list });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const b = await readJson(req);
    const doc = doctorById(String(b?.doctorId || ""));
    if (!doc) throw new HttpError(400, "Shifokor topilmadi");
    const text = typeof b?.text === "string" ? b.text.trim() : "";
    if (!text) throw new HttpError(400, "Xabar boʻsh");
    if (text.length > 500) throw new HttpError(400, "Xabar 500 belgidan oshmasligi kerak");
    await prisma.doctorMessage.create({ data: { userId: user.id, doctorId: doc.id, sender: "me", text, read: true } });
    const prev = await prisma.doctorMessage.findMany({ where: { userId: user.id, doctorId: doc.id, sender: "doctor" } });
    const reply = await prisma.doctorMessage.create({
      data: { userId: user.id, doctorId: doc.id, sender: "doctor", text: demoReplies[prev.length % demoReplies.length], read: true },
    });
    return NextResponse.json({ reply, flags: assessMessage(text), demo: true });
  } catch (e) { return apiError(e); }
}

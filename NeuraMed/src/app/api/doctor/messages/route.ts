/** Shifokor chati: GET ?patientId= — suhbat (o'qilgan deb belgilanadi); POST { patientId, text } — javob. */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/auth";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { assertPatientAccess } from "@/lib/modules/doctors";

export async function GET(req: NextRequest) {
  try {
    const doc = await requireDoctor();
    const patientId = req.nextUrl.searchParams.get("patientId") || "";
    await assertPatientAccess(doc.doctorRef, patientId);
    await prisma.doctorMessage.updateMany({ where: { userId: patientId, doctorId: doc.doctorRef, sender: "me" }, data: { read: true } });
    const list = await prisma.doctorMessage.findMany({ where: { userId: patientId, doctorId: doc.doctorRef }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ data: list });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const doc = await requireDoctor();
    const b = await readJson(req);
    const patientId = String(b?.patientId || "");
    await assertPatientAccess(doc.doctorRef, patientId);
    const text = typeof b?.text === "string" ? b.text.trim() : "";
    if (!text) throw new HttpError(400, "Xabar boʻsh");
    if (text.length > 1000) throw new HttpError(400, "Xabar 1000 belgidan oshmasligi kerak");
    const msg = await prisma.doctorMessage.create({ data: { userId: patientId, doctorId: doc.doctorRef, sender: "doctor", text, read: false } });
    return NextResponse.json({ data: msg });
  } catch (e) { return apiError(e); }
}

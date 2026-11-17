/** Hayotiy ko'rsatkichlar: GET — barcha turlar bo'yicha so'nggi o'lchovlar va baholash; POST — yangi o'lchov. */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { assessVital, vitalDef, type VitalType } from "@/lib/modules/vitals";
import { loadVitals } from "@/lib/modules/vitals-db";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json(await loadVitals(user.id));
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const b = await readJson(req);
    const def = vitalDef(String(b?.type || ""));
    if (!def) throw new HttpError(400, "Koʻrsatkich turini tanlang");
    const value = Number(b?.value);
    if (!Number.isFinite(value) || value < def.min || value > def.max) throw new HttpError(400, "Qiymat ruxsat etilgan oraliqdan tashqarida");
    let value2: number | null = null;
    if (def.type === "bp") {
      value2 = Number(b?.value2);
      if (!Number.isFinite(value2) || value2 < (def.min2 as number) || value2 > (def.max2 as number) || value2 >= value) throw new HttpError(400, "Bosimni toʻgʻri kiriting: yuqori / pastki (masalan 120/80)");
    }
    const history: any[] = (await prisma.vitalReading.findMany({ where: { userId: user.id, type: def.type } })).sort((a: any, c: any) => String(c.at).localeCompare(String(a.at)));
    const u: any = await prisma.user.findUnique({ where: { id: user.id } });
    const assessment = assessVital(def.type as VitalType, value, value2, history, u?.heightCm);
    const note = typeof b?.note === "string" ? b.note.trim().slice(0, 80) : null;
    const rec = await prisma.vitalReading.create({ data: { userId: user.id, type: def.type, value, value2, note, at: new Date() } });
    return NextResponse.json({ data: rec, assessment });
  } catch (e) { return apiError(e); }
}

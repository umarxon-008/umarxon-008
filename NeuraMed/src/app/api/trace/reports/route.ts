/** Shubhali holat haqida xabar (demo: bazaga saqlanadi, nazorat organiga yuborilmaydi). */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { findProduct } from "@/lib/modules/trace";
import { apiError, HttpError, readJson } from "@/lib/modules/http";

const REASONS = ["Qadoq shikastlangan yoki oʻzgartirilgan", "QR kod / partiya raqami mos emas", "Narx yoki sotuv joyi shubhali", "Boshqa sabab"];

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const b = await readJson(req);
    if (!findProduct(String(b?.productId || ""))) throw new HttpError(400, "Mahsulot topilmadi");
    if (!REASONS.includes(b?.reason)) throw new HttpError(400, "Sababni tanlang");
    const note = typeof b?.note === "string" ? b.note.trim().slice(0, 300) : "";
    const r = await prisma.traceReport.create({ data: { userId: user.id, productId: b.productId, reason: b.reason, note } });
    return NextResponse.json({ data: { id: r.id }, demo: true, message: "Xabar saqlandi. Rahmat!" });
  } catch (e) { return apiError(e); }
}

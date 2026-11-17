/** №17: partiya sifati bo'yicha AI xulosa (OpenAI kaliti bo'lsa). Kalitsiz — brauzer shablon xulosani ko'rsatadi. */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { explainQuality } from "@/lib/ai";
import { getLocale } from "@/i18n/server";
import { findProduct, localAnalogs, qualityOf } from "@/lib/modules/trace";
import { apiError, HttpError } from "@/lib/modules/http";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const p = findProduct(params.id);
    if (!p) throw new HttpError(404, "Mahsulot topilmadi");
    const q = qualityOf(p.id);
    const text = await explainQuality({
      product: { name: p.name, form: p.form, substance: p.substance, manufacturer: p.manufacturer, local: p.local, batch: p.batch, status: p.status, statusNote: p.statusNote, expiryDate: p.expiryDate.slice(0, 10) },
      certificates: q?.certificates, lab: q?.lab, trust: q?.trust, localAlternatives: localAnalogs(p.id), note: "Barcha maʼlumotlar namunaviy (demo).",
    }, getLocale());
    if (!text) throw new HttpError(503, "AI hozir javob bermadi — shablon xulosa koʻrsatildi");
    return NextResponse.json({ text, mode: "ai" });
  } catch (e) { return apiError(e); }
}

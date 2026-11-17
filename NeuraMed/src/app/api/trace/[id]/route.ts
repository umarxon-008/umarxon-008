import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { findProduct, qualityOf, localAnalogs } from "@/lib/modules/trace";
import { isAIEnabled } from "@/lib/ai";
import { apiError, HttpError } from "@/lib/modules/http";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const p = findProduct(params.id);
    if (!p) throw new HttpError(404, "Mahsulot topilmadi");
    return NextResponse.json({ data: p, quality: qualityOf(p.id), analogs: localAnalogs(p.id), aiEnabled: isAIEnabled(), demo: true });
  } catch (e) { return apiError(e); }
}

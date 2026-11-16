import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { findProduct } from "@/lib/modules/trace";
import { apiError, HttpError } from "@/lib/modules/http";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const p = findProduct(params.id);
    if (!p) throw new HttpError(404, "Mahsulot topilmadi");
    return NextResponse.json({ data: p, demo: true });
  } catch (e) { return apiError(e); }
}

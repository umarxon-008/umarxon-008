/** PHARMA TRACE: GET /api/trace?q=... — qidiruv; q bo'lmasa barcha namunaviy mahsulotlar va statistika. */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { allProducts, searchProducts, traceSummary, localSummary } from "@/lib/modules/trace";
import { apiError } from "@/lib/modules/http";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 60);
    const s = traceSummary();
    return NextResponse.json({
      data: q ? searchProducts(q) : allProducts(),
      summary: { total: s.total, verified: s.verified, pending: s.pending, suspicious: s.suspicious.length },
      local: localSummary(),
      demo: true,
    });
  } catch (e) { return apiError(e); }
}

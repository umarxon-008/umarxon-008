/** MEDSTOCK AI: GET /api/stock — zaxira, qoidaga asoslangan tahlil va harakatlar (demo ombor). */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { loadStock } from "@/lib/modules/stock-db";
import { apiError } from "@/lib/modules/http";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ ...(await loadStock(user.id)), demo: true });
  } catch (e) { return apiError(e); }
}

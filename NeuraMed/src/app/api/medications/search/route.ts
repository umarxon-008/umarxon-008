import { NextRequest, NextResponse } from "next/server";
import { searchRxNorm } from "@/lib/api/drug-sources";
import { getSession } from "@/lib/auth";

// GET /api/medications/search?q=paracetamol
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchRxNorm(q);

  // Filter to most useful term types
  const filtered = results
    .filter((r) => ["IN", "BN", "SCD", "PIN", "GPCK"].includes(r.tty))
    .slice(0, 10)
    .map((r) => ({ rxcui: r.rxcui, name: r.name, tty: r.tty }));

  return NextResponse.json({ results: filtered });
}

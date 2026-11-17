/** Chekap: GET — savollar va natijalar tarixi; POST { answers } — natija (Health Score). */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { AREAS, QUESTIONS, scoreCheckup } from "@/lib/modules/checkup";

export async function GET() {
  try {
    const user = await requireAuth();
    const list: any[] = await prisma.checkup.findMany({ where: { userId: user.id } });
    const history = list
      .map((c) => ({ id: c.id, score: c.score, areas: JSON.parse(c.scoresJson || "[]"), createdAt: new Date(c.createdAt).toISOString() }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ questions: QUESTIONS, areas: AREAS, history });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const b = await readJson(req);
    const answers = b?.answers && typeof b.answers === "object" ? b.answers : {};
    let result;
    try { result = scoreCheckup(answers); } catch { throw new HttpError(400, "Barcha savollarga javob bering"); }
    await prisma.checkup.create({ data: { userId: user.id, answersJson: JSON.stringify(answers), score: result.score, scoresJson: JSON.stringify(result.areas) } });
    return NextResponse.json(result);
  } catch (e) { return apiError(e); }
}

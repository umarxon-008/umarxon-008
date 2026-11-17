import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/modules/http";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const r = await prisma.vitalReading.findFirst({ where: { id: params.id, userId: user.id } });
    if (!r) throw new HttpError(404, "Oʻlchov topilmadi");
    await prisma.vitalReading.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) { return apiError(e); }
}

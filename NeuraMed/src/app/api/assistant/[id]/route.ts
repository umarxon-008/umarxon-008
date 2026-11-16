import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/modules/http";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const t: any = await prisma.assistantThread.findFirst({ where: { id: params.id, userId: user.id } });
    if (!t) throw new HttpError(404, "Suhbat topilmadi");
    return NextResponse.json({ data: { id: t.id, title: t.title, messages: JSON.parse(t.messagesJson || "[]") } });
  } catch (e) { return apiError(e); }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const t = await prisma.assistantThread.findFirst({ where: { id: params.id, userId: user.id } });
    if (!t) throw new HttpError(404, "Suhbat topilmadi");
    await prisma.assistantThread.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) { return apiError(e); }
}

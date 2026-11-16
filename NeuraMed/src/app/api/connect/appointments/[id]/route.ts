import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/modules/http";

/** PATCH — yozilishni bekor qilish. */
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const a = await prisma.appointment.findFirst({ where: { id: params.id, userId: user.id } });
    if (!a) throw new HttpError(404, "Yozilish topilmadi");
    const updated = await prisma.appointment.update({ where: { id: params.id }, data: { status: "cancelled" } });
    return NextResponse.json({ data: updated });
  } catch (e) { return apiError(e); }
}

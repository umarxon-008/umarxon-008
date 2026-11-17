import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePatient } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/modules/http";

/**
 * PATCH — yozilishni bekor qilish (body bo'sh yoki { action: "cancel" })
 * yoki shifokorga ruxsatni boshqarish ({ action: "share", value: boolean }).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requirePatient();
    const a = await prisma.appointment.findFirst({ where: { id: params.id, userId: user.id } });
    if (!a) throw new HttpError(404, "Yozilish topilmadi");
    const b: any = await req.json().catch(() => ({}));
    if (b?.action === "share") {
      const updated = await prisma.appointment.update({ where: { id: params.id }, data: { shareAccess: !!b.value } });
      return NextResponse.json({ data: updated });
    }
    const updated = await prisma.appointment.update({ where: { id: params.id }, data: { status: "cancelled" } });
    return NextResponse.json({ data: updated });
  } catch (e) { return apiError(e); }
}

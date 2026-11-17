import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { slotsFor } from "@/lib/modules/connect";
import { findDoctor } from "@/lib/modules/doctors";
import { apiError, HttpError } from "@/lib/modules/http";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const doc = await findDoctor(req.nextUrl.searchParams.get("doctorId") || "");
    if (!doc) throw new HttpError(404, "Shifokor topilmadi");
    const taken = await prisma.appointment.findMany({ where: { doctorId: doc.id, status: "pending" } });
    return NextResponse.json({ data: slotsFor(doc, taken as any) });
  } catch (e) { return apiError(e); }
}

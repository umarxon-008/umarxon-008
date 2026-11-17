/** Shifokor: bemor chekapi — GET tarix; POST { answers, conclusion } chekapni o'tkazish. */
import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/auth";
import { apiError, readJson } from "@/lib/modules/http";
import { assertPatientAccess } from "@/lib/modules/doctors";
import { checkupHistory, saveCheckup } from "@/lib/modules/care";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const doc = await requireDoctor();
    await assertPatientAccess(doc.doctorRef, params.id);
    return NextResponse.json(await checkupHistory(params.id));
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await requireDoctor();
    await assertPatientAccess(doc.doctorRef, params.id);
    const result = await saveCheckup(params.id, await readJson(req), { ref: doc.doctorRef, name: doc.name || "Shifokor" });
    return NextResponse.json(result);
  } catch (e) { return apiError(e); }
}

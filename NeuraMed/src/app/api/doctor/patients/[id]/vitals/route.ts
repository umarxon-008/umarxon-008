/** Shifokor: bemor ko'rsatkichlari — GET; POST { type, value, note }; DELETE ?rid= */
import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/auth";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { assertPatientAccess } from "@/lib/modules/doctors";
import { deleteVital, saveVital } from "@/lib/modules/care";
import { loadVitals } from "@/lib/modules/vitals-db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const doc = await requireDoctor();
    await assertPatientAccess(doc.doctorRef, params.id);
    return NextResponse.json(await loadVitals(params.id));
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await requireDoctor();
    await assertPatientAccess(doc.doctorRef, params.id);
    return NextResponse.json(await saveVital(params.id, await readJson(req), { ref: doc.doctorRef, name: doc.name || "Shifokor" }));
  } catch (e) { return apiError(e); }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await requireDoctor();
    await assertPatientAccess(doc.doctorRef, params.id);
    const rid = req.nextUrl.searchParams.get("rid");
    if (!rid) throw new HttpError(400, "Oʻlchovni tanlang");
    await deleteVital(params.id, rid, doc.doctorRef);
    return NextResponse.json({ ok: true });
  } catch (e) { return apiError(e); }
}

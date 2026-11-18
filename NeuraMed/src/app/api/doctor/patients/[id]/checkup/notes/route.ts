/** Shifokor: saqlangan chekapga izoh qo'shish — POST { checkupId, text }. */
import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/auth";
import { apiError, readJson } from "@/lib/modules/http";
import { assertPatientAccess } from "@/lib/modules/doctors";
import { addCheckupNote } from "@/lib/modules/care";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const doc = await requireDoctor();
    await assertPatientAccess(doc.doctorRef, params.id);
    const note = await addCheckupNote(params.id, await readJson(req), { ref: doc.doctorRef, name: doc.name || "Shifokor" });
    return NextResponse.json({ data: note });
  } catch (e) { return apiError(e); }
}

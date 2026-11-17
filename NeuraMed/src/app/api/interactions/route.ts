/** Dorilar o'zaro ta'siri: GET — faol eslatmalardagi dorilarni tekshirish; POST { drugs: string[] } — ixtiyoriy ro'yxat. */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { checkInteractions, KNOWN_COUNT } from "@/lib/modules/interactions";
import { activeMedicationNames, getHealthProfile } from "@/lib/modules/health-profile";

export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await getHealthProfile(user.id);
    const meds = await activeMedicationNames(user.id, profile?.currentMedications || []);
    return NextResponse.json({ medications: meds, result: checkInteractions(meds), coverage: KNOWN_COUNT });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const b = await readJson(req);
    const drugs = Array.isArray(b?.drugs) ? b.drugs.filter((d: unknown) => typeof d === "string").map((d: string) => d.slice(0, 80)).slice(0, 20) : [];
    if (drugs.length < 2) throw new HttpError(400, "Kamida ikkita dori kiriting");
    return NextResponse.json({ result: checkInteractions(drugs), coverage: KNOWN_COUNT });
  } catch (e) { return apiError(e); }
}

/** Ko'rsatkichlar (bemor): GET — shifokor kiritgan o'lchovlar va baholash. Kiritish faqat shifokorda. */
import { NextResponse } from "next/server";
import { requirePatient } from "@/lib/auth";
import { apiError } from "@/lib/modules/http";
import { loadVitals } from "@/lib/modules/vitals-db";

export async function GET() {
  try {
    const user = await requirePatient();
    return NextResponse.json(await loadVitals(user.id));
  } catch (e) { return apiError(e); }
}

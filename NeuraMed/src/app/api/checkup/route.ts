/** Chekap (bemor): GET — natijalar tarixi, shifokor xulosasi. Chekapni faqat shifokor o'tkazadi (/api/doctor/patients/[id]/checkup). */
import { NextResponse } from "next/server";
import { requirePatient } from "@/lib/auth";
import { apiError } from "@/lib/modules/http";
import { checkupHistory } from "@/lib/modules/care";

export async function GET() {
  try {
    const user = await requirePatient();
    return NextResponse.json(await checkupHistory(user.id));
  } catch (e) { return apiError(e); }
}

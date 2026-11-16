import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendReminderNotification } from "@/lib/notifications";

// POST /api/notifications/send — trigger a push notification for a reminder
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json();

  const { reminderId, medicationName, dose, foodRule } = body;

  if (!reminderId || !medicationName || !dose) {
    return NextResponse.json({ error: "Ma'lumotlar yetarli emas" }, { status: 400 });
  }

  const sent = await sendReminderNotification(
    user.id,
    reminderId,
    medicationName,
    dose,
    foodRule ?? "ahamiyatsiz"
  );

  return NextResponse.json({ ok: sent });
}

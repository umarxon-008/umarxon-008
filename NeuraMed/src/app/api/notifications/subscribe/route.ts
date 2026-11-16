import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { saveSubscription } from "@/lib/notifications";
import type { PushSubscriptionData } from "@/types";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json() as PushSubscriptionData;

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Noto'g'ri subscription ma'lumoti" }, { status: 400 });
  }

  await saveSubscription(user.id, body);
  return NextResponse.json({ ok: true });
}

/** 🔔 Bildirishnomalar: GET — ro'yxat va o'qilmaganlar soni; POST — hammasini o'qildi deb belgilash. */
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/modules/http";
import { buildFeed, markAllRead } from "@/lib/modules/notifications-feed";

export async function GET() {
  try {
    const user = await requireAuth();
    const items = await buildFeed(user);
    return NextResponse.json({ items, unread: items.filter((x) => x.unread).length });
  } catch (e) { return apiError(e); }
}

export async function POST() {
  try {
    const user = await requireAuth();
    await markAllRead(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) { return apiError(e); }
}

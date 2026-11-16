import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { itemStatus } from "@/lib/modules/stock";
import { apiError, HttpError, readJson } from "@/lib/modules/http";

/** POST — kirim yoki chiqim: { itemId, type: "in"|"out", qty, note } */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const b = await readJson(req);
    const item: any = await prisma.stockItem.findFirst({ where: { id: String(b?.itemId || ""), userId: user.id } });
    if (!item) throw new HttpError(404, "Pozitsiya topilmadi");
    const type = b?.type === "in" ? "in" : b?.type === "out" ? "out" : null;
    if (!type) throw new HttpError(400, "Harakat turini tanlang");
    const qty = Number(b?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10000) throw new HttpError(400, "Miqdor 1 dan 10 000 gacha butun son boʻlishi kerak");
    if (type === "out" && qty > item.qty) throw new HttpError(400, `Omborda faqat ${item.qty} ${item.unit} bor`);
    const updated: any = await prisma.stockItem.update({ where: { id: item.id }, data: { qty: item.qty + (type === "in" ? qty : -qty) } });
    const note = typeof b?.note === "string" && b.note.trim() ? b.note.trim().slice(0, 80) : type === "in" ? "Kirim" : "Chiqim";
    await prisma.stockMovement.create({ data: { userId: user.id, itemId: item.id, type, qty, note, at: new Date() } });
    return NextResponse.json({ data: updated, status: itemStatus(updated) });
  } catch (e) { return apiError(e); }
}

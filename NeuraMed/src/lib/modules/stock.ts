/**
 * MEDSTOCK AI — zaxira tahlili. "AI tahlil" QOIDAGA ASOSLANGAN (haqiqiy AI emas):
 * kam qolgan (min dan past yoki tez tugaydi), muddati yaqin, qayta buyurtma tavsiyasi.
 */
// @ts-ignore — JS ma'lumot moduli
import { STOCK_ITEMS, LEAD_TIME_DAYS, EXPIRY_WARN_DAYS } from "@/data/stock-data.js";
import { dayOffset, daysUntil, isoDay } from "./dates";

export const LEAD_TIME = LEAD_TIME_DAYS as number;
export const EXPIRY_WARN = EXPIRY_WARN_DAYS as number;

export interface StockItemRow { id: string; name: string; category: string; unit: string; qty: number; min: number; avgDaily: number; batch: string; expiry: string; shelf: string; price: number }
export type StockStatusKey = "ok" | "low" | "expiring" | "expired";

/** Foydalanuvchi uchun boshlang'ich namunaviy zaxira va 14 kunlik harakatlar. */
export function seedData(userId: string) {
  const items = (STOCK_ITEMS as any[]).map((i) => ({
    userId, name: i.name, category: i.category, unit: i.unit, qty: i.qty, min: i.min, avgDaily: i.avgDaily,
    batch: i.batch, expiry: isoDay(dayOffset(i.expiresIn)), shelf: i.shelf, price: i.price,
  }));
  return items;
}

export function seedMovements(userId: string, items: { id: string; min: number; avgDaily: number }[]) {
  const moves: { userId: string; itemId: string; type: string; qty: number; note: string; at: Date }[] = [];
  items.forEach((it, idx) => {
    for (let d = 14; d >= 1; d -= 1) {
      const wave = 0.6 + ((idx * 7 + d * 3) % 9) / 10;
      moves.push({ userId, itemId: it.id, type: "out", qty: Math.max(1, Math.round(it.avgDaily * wave)), note: "Sotuv (namuna)", at: dayOffset(-d) });
    }
    if (idx % 3 === 0) moves.push({ userId, itemId: it.id, type: "in", qty: Math.round(it.min * 1.5), note: "Distribyutordan kirim (namuna)", at: dayOffset(-(idx % 10) - 3) });
  });
  return moves;
}

export function itemStatus(it: StockItemRow) {
  const left = daysUntil(it.expiry);
  let key: StockStatusKey = "ok";
  if (left < 0) key = "expired";
  else if (it.qty < it.min) key = "low";
  else if (left <= EXPIRY_WARN) key = "expiring";
  const label = { ok: "Meʼyorda", low: "Kam qolgan", expiring: "Muddati yaqin", expired: "Muddati oʻtgan" }[key];
  return { key, label, left };
}

export function analyze(items: StockItemRow[]) {
  const rows = items.map((it) => ({ it, st: itemStatus(it), cover: it.avgDaily > 0 ? it.qty / it.avgDaily : Infinity }));
  const declining = rows.filter((r) => r.st.key !== "expired" && (r.it.qty < r.it.min || r.cover < LEAD_TIME + 7)).sort((a, b) => a.cover - b.cover);
  const expiring = rows.filter((r) => r.st.left <= EXPIRY_WARN).sort((a, b) => a.st.left - b.st.left);
  const reorder = declining.map((r) => ({ ...r, suggest: Math.max(0, Math.ceil(r.it.avgDaily * 30 + r.it.min - r.it.qty)) })).filter((r) => r.suggest > 0);
  const by = (k: StockStatusKey) => rows.filter((r) => r.st.key === k).length;
  return {
    rows: rows.map((r) => ({ ...r.it, status: r.st, cover: Number.isFinite(r.cover) ? Math.floor(r.cover) : null })),
    declining: declining.map((r) => ({ id: r.it.id, name: r.it.name, qty: r.it.qty, unit: r.it.unit, min: r.it.min, cover: Math.floor(r.cover) })),
    expiring: expiring.map((r) => ({ id: r.it.id, name: r.it.name, qty: r.it.qty, unit: r.it.unit, expiry: r.it.expiry, left: r.st.left })),
    reorder: reorder.map((r) => ({ id: r.it.id, name: r.it.name, unit: r.it.unit, suggest: r.suggest, cost: r.suggest * r.it.price })),
    value: items.reduce((s, it) => s + it.qty * it.price, 0),
    counts: { total: items.length, ok: by("ok"), low: by("low"), expiring: rows.filter((r) => r.st.left >= 0 && r.st.left <= EXPIRY_WARN).length, expired: by("expired") },
    distribution: { ok: by("ok"), low: by("low"), expiring: by("expiring"), expired: by("expired") },
    rules: { leadTime: LEAD_TIME, expiryWarn: EXPIRY_WARN },
  };
}

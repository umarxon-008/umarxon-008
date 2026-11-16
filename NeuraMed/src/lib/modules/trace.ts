/**
 * PHARMA TRACE — namunaviy mahsulotlar (davlat reestri yoki real sertifikatlashga ulanmagan).
 * Sanalar bugungi kunga nisbatan hisoblanadi, shuning uchun demo doim dolzarb ko'rinadi.
 */
// @ts-ignore — JS ma'lumot moduli
import { TRACE_PRODUCTS, STAGES } from "@/data/trace-data.js";
import { dayOffset, daysUntil } from "./dates";

export type TraceStatus = "verified" | "pending" | "suspicious";
export type ChainState = "done" | "current" | "pending" | "issue";
export interface TraceStep { stage: string; stageLabel: string; org: string; place: string; date: string | null; temp: string; state: ChainState; note: string }
export interface TraceProduct {
  id: string; qr: string; name: string; form: string; substance: string; category: string;
  manufacturer: { name: string; country: string; license: string };
  batch: string; mfgDate: string; expiryDate: string; daysLeft: number; status: TraceStatus; statusNote: string; chain: TraceStep[];
}

const RAW = TRACE_PRODUCTS as any[];
const norm = (s: string) => String(s || "").toLowerCase().replace(/[ʻʼ‘’`']/g, "'").trim();

export function materialize(p: any): TraceProduct {
  const expiry = dayOffset(p.expiry);
  return {
    id: p.id, qr: p.qr, name: p.name, form: p.form, substance: p.substance, category: p.category, manufacturer: p.manufacturer,
    batch: p.batch, mfgDate: dayOffset(p.mfg).toISOString(), expiryDate: expiry.toISOString(), daysLeft: daysUntil(expiry),
    status: p.status, statusNote: p.statusNote,
    chain: p.chain.map((c: any) => ({ ...c, stageLabel: (STAGES as any)[c.stage].label, date: c.day === null ? null : dayOffset(c.day).toISOString() })),
  };
}

export const allProducts = (): TraceProduct[] => RAW.map(materialize);
export const findProduct = (id: string): TraceProduct | null => { const p = RAW.find((x) => x.id === id); return p ? materialize(p) : null; };

export function searchProducts(q: string): TraceProduct[] {
  const n = norm(q);
  if (!n) return [];
  return RAW.filter((p) => [p.name, p.substance, p.id, p.qr, p.batch, p.manufacturer.name, p.category].some((v) => norm(v).includes(n))).map(materialize);
}

export function traceSummary() {
  const list = allProducts();
  return {
    total: list.length,
    verified: list.filter((p) => p.status === "verified").length,
    pending: list.filter((p) => p.status === "pending").length,
    suspicious: list.filter((p) => p.status === "suspicious"),
  };
}

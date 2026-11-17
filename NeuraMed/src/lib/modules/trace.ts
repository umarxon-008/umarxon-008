/**
 * PHARMA TRACE — namunaviy mahsulotlar (davlat reestri yoki real sertifikatlashga ulanmagan).
 * Sanalar bugungi kunga nisbatan hisoblanadi, shuning uchun demo doim dolzarb ko'rinadi.
 */
// @ts-ignore — JS ma'lumot moduli
import { TRACE_PRODUCTS, STAGES } from "@/data/trace-data.js";
// @ts-ignore — JS ma'lumot moduli
import { QUALITY } from "@/data/trace-quality.js";
import { dayOffset, daysUntil } from "./dates";

export type TraceStatus = "verified" | "pending" | "suspicious";
export type ChainState = "done" | "current" | "pending" | "issue";
export interface TraceStep { stage: string; stageLabel: string; org: string; place: string; date: string | null; temp: string; state: ChainState; note: string }
export interface TraceProduct {
  id: string; qr: string; name: string; form: string; substance: string; category: string;
  manufacturer: { name: string; country: string; license: string };
  batch: string; mfgDate: string; expiryDate: string; daysLeft: number; status: TraceStatus; statusNote: string; chain: TraceStep[];
  local: boolean; trust: number | null;
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
    local: isLocal(p), trust: trustOf(p)?.score ?? null,
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

// ─── №17: Mahalliy dorilarga ishonch — sertifikatlar, laboratoriya, ishonch indeksi, analoglar ───

const LOCAL_COUNTRY = /o.?zbekiston/i;
export const isLocal = (p: any) => LOCAL_COUNTRY.test(String(p?.manufacturer?.country || ""));

export type CertStatus = "valid" | "expired" | "pending" | "missing";
export interface Certificate { type: string; number: string; issuer: string; validUntil: string | null; status: CertStatus }
export interface LabTest { test: string; spec: string; result: string; pass: boolean }
export interface LabReport { lab: string; date: string | null; pending: boolean; tests: LabTest[] }
export interface TrustPart { key: string; label: string; points: number; max: number }
export interface Quality {
  price: number | null; local: boolean; certificates: Certificate[]; lab: LabReport;
  confirmations: { doctors: number; pharmacists: number };
  trust: { score: number; parts: TrustPart[] };
}

function certsOf(q: any): Certificate[] {
  return (q?.certificates || []).map((c: any) => {
    const status: CertStatus = c.missing ? "missing" : c.pending ? "pending" : c.validDays != null && c.validDays < 0 ? "expired" : "valid";
    return { type: c.type, number: c.number, issuer: c.issuer, validUntil: c.validDays != null ? dayOffset(c.validDays).toISOString() : null, status };
  });
}

/** Ishonch indeksi (0–100): sertifikatlar 30 + laboratoriya 30 + ta'minot zanjiri 25 + mutaxassis tasdiqlari 15. */
export function trustOf(p: any) {
  const q = (QUALITY as any)[p?.id];
  if (!q) return null;
  const certs = certsOf(q);
  const certPts = certs.length ? Math.round((certs.filter((c) => c.status === "valid").length / certs.length) * 30) : 0;
  const tests = q.lab?.tests || [];
  const labPts = tests.length ? Math.round((tests.filter((t: any) => t.pass).length / tests.length) * 30) : 0;
  const chainPts = p.status === "verified" ? 25 : p.status === "pending" ? 12 : 0;
  const conf = (q.confirmations?.doctors || 0) + (q.confirmations?.pharmacists || 0);
  const confPts = Math.round(Math.min(1, conf / 30) * 15);
  const parts: TrustPart[] = [
    { key: "certs", label: "Sifat sertifikatlari", points: certPts, max: 30 },
    { key: "lab", label: "Laboratoriya natijalari", points: labPts, max: 30 },
    { key: "chain", label: "Taʼminot zanjiri", points: chainPts, max: 25 },
    { key: "conf", label: "Shifokor va farmatsevt tasdiqlari", points: confPts, max: 15 },
  ];
  return { score: parts.reduce((s, x) => s + x.points, 0), parts };
}

export function qualityOf(id: string): Quality | null {
  const p = RAW.find((x) => x.id === id);
  const q = (QUALITY as any)[id];
  if (!p || !q) return null;
  return {
    price: q.price ?? null,
    local: isLocal(p),
    certificates: certsOf(q),
    lab: { lab: q.lab?.lab || "—", date: q.lab?.day != null ? dayOffset(q.lab.day).toISOString() : null, pending: !!q.lab?.pending, tests: q.lab?.tests || [] },
    confirmations: q.confirmations || { doctors: 0, pharmacists: 0 },
    trust: trustOf(p)!,
  };
}

/** Import (yoki shubhali) dori uchun shu faol moddali, ishonchli mahalliy muqobillar. */
export function localAnalogs(id: string) {
  const p = RAW.find((x) => x.id === id);
  if (!p) return [];
  const price = (QUALITY as any)[id]?.price ?? null;
  return RAW.filter((x) => x.id !== id && isLocal(x) && x.status === "verified" && norm(x.substance) === norm(p.substance))
    .map((x) => {
      const q = (QUALITY as any)[x.id];
      const xp = q?.price ?? null;
      return { id: x.id, name: x.name, form: x.form, manufacturer: x.manufacturer.name, price: xp, trust: trustOf(x)?.score ?? null, cheaperPct: price && xp && xp < price ? Math.round((1 - xp / price) * 100) : null };
    })
    .sort((a, b) => (b.trust ?? 0) - (a.trust ?? 0));
}

/** Mahalliy dorilar bo'yicha qisqa statistika (bosh sahifa va PHARMA TRACE uchun). */
export function localSummary() {
  const locals = RAW.filter((x) => isLocal(x));
  const scores = locals.map((x) => trustOf(x)?.score).filter((x): x is number => typeof x === "number");
  const verified = locals.filter((x) => x.status === "verified");
  return {
    total: locals.length,
    verified: verified.length,
    avgTrust: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    withLab: locals.filter((x) => ((QUALITY as any)[x.id]?.lab?.tests || []).length > 0).length,
  };
}

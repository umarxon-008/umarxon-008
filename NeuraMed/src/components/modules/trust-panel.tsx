"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, FileCheck2, FlaskConical, Sparkles, Stethoscope, ArrowRight, AlertTriangle, Clock3, XCircle, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { api, DemoBadge, useFormat } from "@/components/modules/common";
import { Markdown } from "@/components/modules/markdown";
import type { Quality } from "@/lib/modules/trace";

export interface Analog { id: string; name: string; form: string; manufacturer: string; price: number | null; trust: number | null; cheaperPct: number | null }
interface ProductLite { id: string; name: string; status: "verified" | "pending" | "suspicious"; local: boolean; manufacturer: { name: string } }

export const trustBand = (s: number) => (s >= 80 ? { label: "Yuqori ishonch", color: "#10B981" } : s >= 50 ? { label: "Qoʻshimcha tekshiruv kerak", color: "#F59E0B" } : { label: "Past ishonch — ehtiyot boʻling", color: "#DC2626" });

export function LocalBadge({ local, className }: { local: boolean; className?: string }) {
  const t = useT();
  return local
    ? <span className={cn("inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-900/30 dark:text-sky-300", className)}>🇺🇿 {t("Oʻzbekistonda ishlab chiqarilgan")}</span>
    : <span className={cn("inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300", className)}>{t("Import")}</span>;
}

export function TrustRing({ score, size = 112 }: { score: number; size?: number }) {
  const t = useT();
  const R = 46, C = 2 * Math.PI * R, b = trustBand(score);
  return (
    <svg viewBox="0 0 110 110" style={{ width: size, height: size }} className="shrink-0" role="img" aria-label={t("Ishonch indeksi: {n}", { n: score })}>
      <circle cx="55" cy="55" r={R} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-slate-800" />
      <circle cx="55" cy="55" r={R} fill="none" stroke={b.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(score / 100) * C} ${C}`} transform="rotate(-90 55 55)" />
      <text x="55" y="58" textAnchor="middle" fontSize="28" fontWeight="800" className="fill-slate-900 dark:fill-white">{score}</text>
      <text x="55" y="75" textAnchor="middle" fontSize="10" className="fill-slate-400">/ 100</text>
    </svg>
  );
}

const CERT = {
  valid: { label: "Amalda", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", icon: BadgeCheck },
  expired: { label: "Muddati oʻtgan", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
  pending: { label: "Tekshiruvda", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: Clock3 },
  missing: { label: "Topilmadi", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: XCircle },
} as const;

/** Brauzerda tuziladigan shablon xulosa (AI kaliti bo'lmaganda). */
function templateSummary(p: ProductLite, q: Quality, analogs: Analog[], t: (s: string, v?: Record<string, string | number>) => string, sum: (n: number) => string) {
  const lines: string[] = [];
  lines.push(t("{name} ({maker}) ishonch indeksi: {score}/100 — {band}.", { name: t(p.name), maker: t(p.manufacturer.name), score: q.trust.score, band: t(trustBand(q.trust.score).label) }));
  const valid = q.certificates.filter((c) => c.status === "valid").length;
  lines.push(t("{n} ta sertifikatdan {v} tasi amalda.", { n: q.certificates.length, v: valid }) + (valid < q.certificates.length ? " " + t("Qolganlari tekshiruvda yoki topilmadi.") : ""));
  if (q.lab.pending || !q.lab.tests.length) lines.push(t("Mustaqil laboratoriya natijasi hali kelmagan."));
  else {
    const passed = q.lab.tests.filter((x) => x.pass).length;
    lines.push(t("Laboratoriya: {p}/{n} ta koʻrsatkich meʼyorda.", { p: passed, n: q.lab.tests.length }));
    const failed = q.lab.tests.filter((x) => !x.pass);
    if (failed.length) lines.push(t("Meʼyordan tashqari: {list}.", { list: failed.map((f) => `${t(f.test)} (${f.result}, ${t("meʼyor")} ${f.spec})`).join("; ") }));
  }
  lines.push(p.status === "verified" ? t("Taʼminot zanjiri toʻliq tasdiqlangan.") : p.status === "pending" ? t("Taʼminot zanjirining oxirgi bosqichi hali tasdiqlanmagan.") : t("Taʼminot zanjirida nomuvofiqliklar bor — bu partiyani sotib olmang va dorixonaga xabar bering."));
  if (p.local) lines.push(t("Bu dori Oʻzbekistonda ishlab chiqarilgan."));
  else if (analogs[0]) lines.push(t("Shu faol moddali mahalliy muqobil bor: {name} ({maker}) — ishonch indeksi {score}/100", { name: t(analogs[0].name), maker: t(analogs[0].manufacturer), score: analogs[0].trust ?? "—" }) + (analogs[0].cheaperPct ? `, ${t("~{p}% arzonroq", { p: analogs[0].cheaperPct })}` : "") + ".");
  lines.push(t("Bu tibbiy maslahat emas: dorini tanlash yoki almashtirishni shifokor yoki farmatsevt bilan kelishing. Maʼlumotlar namunaviy."));
  void sum;
  return lines.map((l) => `- ${l}`).join("\n");
}

export function TrustPanel({ p, q, analogs, aiEnabled }: { p: ProductLite; q: Quality; analogs: Analog[]; aiEnabled: boolean }) {
  const t = useT();
  const fmt = useFormat();
  const [ai, setAi] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const b = trustBand(q.trust.score);
  const askAi = async () => {
    setBusy(true); setErr(null);
    try { setAi((await api<{ text: string }>(`/api/trace/${p.id}/explain`, { method: "POST" })).text); }
    catch (e: any) { setErr(t(e.message)); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {/* Ishonch indeksi */}
      <section className="card-base p-5">
        <div className="flex flex-wrap items-center gap-5">
          <TrustRing score={q.trust.score} />
          <div className="flex-1 min-w-[220px] space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white">{t("Ishonch indeksi")}</h3>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: b.color }}>{t(b.label)}</span>
            </div>
            <ul className="space-y-1.5">
              {q.trust.parts.map((x) => (
                <li key={x.key} className="text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>{t(x.label)}</span><b>{x.points}/{x.max}</b></div>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-primary" style={{ width: `${(x.points / x.max) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-400">{t("Hisob: sertifikatlar 30 + laboratoriya 30 + taʼminot zanjiri 25 + mutaxassis tasdiqlari 15.")}</p>
          </div>
        </div>
      </section>

      {/* Mahalliy muqobil */}
      {!p.local && analogs.length > 0 && (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900 dark:bg-sky-900/20">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Factory className="h-5 w-5 text-sky-700 dark:text-sky-300" />{t("Mahalliy muqobil bor")}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t("Shu faol moddali, Oʻzbekistonda ishlab chiqarilgan va sifati hujjatlar bilan tasdiqlangan dori.")}</p>
          <ul className="mt-3 space-y-2">
            {analogs.map((a) => (
              <li key={a.id}>
                <Link href={`/trace/${a.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-soft dark:bg-slate-900">
                  <TrustRing score={a.trust ?? 0} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">{t(a.name)} · <span className="text-sm font-normal text-slate-500">{t(a.form)}</span></p>
                    <p className="text-xs text-slate-500">{t(a.manufacturer)}</p>
                  </div>
                  {a.price != null && <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmt.sum(a.price)}</span>}
                  {a.cheaperPct ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{t("~{p}% arzonroq", { p: a.cheaperPct })}</span> : null}
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">{t("Bu tavsiya emas: dorini almashtirishni shifokor yoki farmatsevt bilan kelishing.")}</p>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sertifikatlar */}
        <section className="card-base p-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><FileCheck2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />{t("Sifat sertifikatlari")}</h3>
          <ul className="mt-3 space-y-2">
            {q.certificates.map((c) => {
              const s = CERT[c.status];
              return (
                <li key={c.type} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{t(c.type)}</p>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", s.cls)}><s.icon className="h-3.5 w-3.5" />{t(s.label)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{c.number !== "—" ? `№ ${c.number} · ` : ""}{t(c.issuer)}{c.validUntil ? ` · ${t("amal qiladi:")} ${fmt.day(c.validUntil)}` : ""}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Laboratoriya */}
        <section className="card-base p-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><FlaskConical className="h-5 w-5 text-violet-600 dark:text-violet-400" />{t("Mustaqil laboratoriya natijalari")}</h3>
          <p className="mt-1 text-xs text-slate-500">{t(q.lab.lab)}{q.lab.date ? ` · ${fmt.day(q.lab.date)}` : ""}</p>
          {q.lab.pending || !q.lab.tests.length ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"><Clock3 className="h-4 w-4" />{t("Mustaqil laboratoriya natijasi hali kelmagan.")}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400"><th className="py-1.5 pr-2">{t("Koʻrsatkich")}</th><th className="pr-2">{t("Meʼyor")}</th><th className="pr-2">{t("Natija")}</th><th /></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {q.lab.tests.map((x) => (
                    <tr key={x.test}>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-200">{t(x.test)}</td>
                      <td className="pr-2 text-slate-500">{t(x.spec)}</td>
                      <td className={cn("pr-2 font-bold", x.pass ? "text-slate-900 dark:text-white" : "text-red-600 dark:text-red-400")}>{t(x.result)}</td>
                      <td>{x.pass ? <BadgeCheck className="h-4 w-4 text-emerald-600" aria-label={t("Meʼyorda")} /> : <AlertTriangle className="h-4 w-4 text-red-600" aria-label={t("Meʼyordan tashqari")} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Stethoscope className="h-4 w-4" />{t("{d} shifokor va {p} farmatsevt bu partiyani tasdiqlagan", { d: q.confirmations.doctors, p: q.confirmations.pharmacists })} <DemoBadge>namuna</DemoBadge></p>
        </section>
      </div>

      {/* AI xulosa */}
      <section className="card-base p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />{t("Oddiy tilda xulosa")}</h3>
          {ai ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">AI</span> : <DemoBadge>{aiEnabled ? "Shablon" : "Demo · AI emas"}</DemoBadge>}
          {aiEnabled && !ai && <Button size="sm" variant="gradient" disabled={busy} onClick={askAi}><Sparkles className="h-4 w-4" /> {busy ? t("AI tahlil qilmoqda…") : t("AI bilan tushuntirish")}</Button>}
        </div>
        <div className="text-slate-700 dark:text-slate-200"><Markdown text={ai || templateSummary(p, q, analogs, t, fmt.sum)} /></div>
        {err && <p className="text-xs text-amber-700 dark:text-amber-400">{err}</p>}
      </section>
    </div>
  );
}

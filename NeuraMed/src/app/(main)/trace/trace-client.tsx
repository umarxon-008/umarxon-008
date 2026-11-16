"use client";

import { useT } from "@/i18n/client";
import * as React from "react";
import Link from "next/link";
import { ScanSearch, Search, QrCode, ShieldCheck, ShieldAlert, Clock3, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, Chip, DemoNote, Kpi, ModuleHero, useFormat } from "@/components/modules/common";
import { TraceStatusBadge } from "@/components/modules/trace-ui";
import type { TraceProduct } from "@/lib/modules/trace";

const SAMPLES = [
  { code: "QR-MP-7F3K-1001", label: "Tasdiqlangan namuna" },
  { code: "QR-MP-5H1Q-1003", label: "Tekshiruvdagi namuna" },
  { code: "QR-MP-9Z4T-1004", label: "Shubhali namuna" },
];
type Filter = "all" | "verified" | "pending" | "suspicious";

export function TraceClient() {
  const t = useT();
  const [all, setAll] = React.useState<TraceProduct[] | null>(null);
  const [summary, setSummary] = React.useState({ total: 0, verified: 0, pending: 0, suspicious: 0 });
  const [q, setQ] = React.useState("");
  const [result, setResult] = React.useState<TraceProduct[] | null>(null);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api<{ data: TraceProduct[]; summary: typeof summary }>("/api/trace").then((r) => { setAll(r.data); setSummary(r.summary); }).catch((e) => setError(t(e.message)));
  }, []);

  const search = async (code?: string) => {
    const query = (code ?? q).trim();
    if (code) setQ(code);
    if (!query) { setResult(null); return; }
    try { const r = await api<{ data: TraceProduct[] }>(`/api/trace?q=${encodeURIComponent(query)}`); setResult(r.data); setError(null); }
    catch (e: any) { setError(t(e.message)); }
  };

  const list = (all || []).filter((p) => filter === "all" || p.status === filter);

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={ScanSearch} name="PHARMA TRACE" title={t("Dori qayerdan kelganini tekshiring")} text="QR kod yoki partiya raqami orqali dorining ishlab chiqaruvchidan dorixonagacha boʻlgan yoʻlini koʻring." />
      <DemoNote>{t("Namunaviy maʼlumotlar: mahsulotlar va tashkilotlar toʻqima. Davlat reestri yoki real sertifikatlash tizimi bilan integratsiya yoʻq.")}</DemoNote>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Package} label={t("Mahsulotlar")} value={summary.total} />
        <Kpi icon={ShieldCheck} tone="green" label={t("Tasdiqlangan")} value={summary.verified} />
        <Kpi icon={Clock3} tone="amber" label={t("Tekshirilmoqda")} value={summary.pending} />
        <Kpi icon={ShieldAlert} tone="red" label={t("Shubhali")} value={summary.suspicious} />
      </div>

      <section className="card-base p-4 space-y-3">
        <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><QrCode className="h-5 w-5 text-teal-600 dark:text-teal-400" /> {t("QR kod yoki partiya raqamini kiriting")}</h2>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("QR-MP-… , partiya yoki dori nomi")} aria-label={t("QR kod yoki partiya")} className="input-base pl-10" />
          </div>
          <Button type="submit" variant="gradient">{t("Tekshirish")}</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 self-center">{t("Sinab koʻring:")}</span>
          {SAMPLES.map((s) => <Chip key={s.code} onClick={() => search(s.code)}>{t(s.label)}</Chip>)}
        </div>
        {result && (
          result.length === 0 ? (
            <p className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">{t("Bu kod boʻyicha yozuv topilmadi. Kodni tekshiring — topilmasa, mahsulot haqida shubha boʻlsa, dorixonaga murojaat qiling.")}</p>
          ) : (
            <ul className="space-y-2">{result.map((p) => <ProductRow key={p.id} p={p} />)}</ul>
          )
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-slate-900 dark:text-white mr-auto">{t("Barcha namunaviy mahsulotlar")}</h2>
          {(["all", "verified", "pending", "suspicious"] as Filter[]).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{{ all: "Barchasi", verified: "Tasdiqlangan", pending: "Tekshirilmoqda", suspicious: "Shubhali" }[f]}</Chip>
          ))}
        </div>
        {!all ? <LoadingCard /> : <ul className="grid gap-2 lg:grid-cols-2">{list.map((p) => <ProductRow key={p.id} p={p} />)}</ul>}
      </section>
    </div>
  );
}

function ProductRow({ p }: { p: TraceProduct }) {
  const t = useT();
  const formatDay = useFormat().day;
  return (
    <li>
      <Link href={`/trace/${p.id}`} className="card-base flex items-center gap-3 p-3.5 hover:shadow-card transition">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:text-teal-400 dark:bg-teal-900/30"><Package className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{t(p.name)}</p>
          <p className="truncate text-xs text-slate-500">{t(p.form)} {t("· Partiya")} {p.batch} · {formatDay(p.expiryDate)} {t("gacha")}</p>
        </div>
        <TraceStatusBadge status={p.status} />
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </Link>
    </li>
  );
}

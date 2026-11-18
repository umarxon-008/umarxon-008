"use client";

import { useT } from "@/i18n/client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScanSearch, Search, ChevronRight, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/components/modules/common";
import { TraceStatusBadge } from "@/components/modules/trace-ui";
import { trustBand } from "@/components/modules/trust-panel";
import type { TraceProduct } from "@/lib/modules/trace";

/**
 * PHARMA TRACE: faqat qidiruv. Dori nomi, partiya raqami yoki QR kod kiritiladi.
 * Bitta natija — darhol dori sahifasi ochiladi; bir nechta — qisqa ro'yxatdan tanlanadi.
 */
export function TraceClient() {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [result, setResult] = React.useState<TraceProduct[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const search = async () => {
    const query = q.trim();
    if (!query) return;
    setBusy(true); setError(null);
    try {
      const r = await api<{ data: TraceProduct[] }>(`/api/trace?q=${encodeURIComponent(query)}`);
      if (r.data.length === 1) { router.push(`/trace/${r.data[0].id}`); return; }
      setResult(r.data);
    } catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 space-y-6">
      <section className="card-base p-6 sm:p-8 text-center">
        <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
          <ScanSearch className="h-8 w-8" />
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("Dorini tekshirish")}</h1>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{t("Dori nomi yoki partiya raqamini kiriting")}</p>
        <form onSubmit={(e) => { e.preventDefault(); search(); }} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setResult(null); }}
              placeholder={t("Masalan: Metformin yoki SM-2406-210")}
              aria-label={t("Dori nomi yoki partiya raqami")}
              className="input-base h-14 w-full pl-12 text-lg"
              autoFocus
            />
          </div>
          <Button type="submit" variant="gradient" className="h-14 px-8 text-lg" disabled={busy || !q.trim()} loading={busy}>{t("Tekshirish")}</Button>
        </form>
        {error && <p role="alert" className="mt-3 text-base text-red-600 dark:text-red-400">{error}</p>}
      </section>

      {result && result.length === 0 && (
        <section className="card-base flex flex-col items-center gap-2 p-8 text-center">
          <SearchX className="h-10 w-10 text-slate-400" />
          <p className="text-lg font-semibold text-slate-900 dark:text-white">{t("Bunday dori yoki partiya topilmadi")}</p>
          <p className="text-base text-slate-600 dark:text-slate-300">{t("Yozuvni tekshiring. Shubha boʻlsa, dorixonaga murojaat qiling.")}</p>
        </section>
      )}

      {result && result.length > 1 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("{n} ta dori topildi", { n: result.length })}</h2>
          <ul className="grid grid-cols-1 gap-3">
            {result.map((p) => (
              <li key={p.id} className="min-w-0">
                <Link href={`/trace/${p.id}`} className="card-base flex min-w-0 items-center gap-4 p-4 transition hover:border-primary-300 hover:shadow-card">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{t(p.name)}</p>
                    <p className="truncate text-sm text-slate-600 dark:text-slate-300">{t(p.manufacturer.name)} · {p.batch}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <TraceStatusBadge status={p.status} />
                      {p.local && <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">{t("Mahalliy")}</span>}
                      {p.trust != null && <span className="text-sm font-bold" style={{ color: trustBand(p.trust).color }}>{t("Ishonch")}: {p.trust}/100</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

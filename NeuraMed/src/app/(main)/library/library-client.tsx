"use client";

import { useT, useLocale } from "@/i18n/client";
import * as React from "react";
import Link from "next/link";
import { BookOpen, Search, AlertTriangle, MessageSquare, ExternalLink } from "lucide-react";
import type { LibraryTerm } from "@/lib/medai";
import { Button } from "@/components/ui/button";
import { Chip, DemoNote, Modal, ModuleHero } from "@/components/modules/common";

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’`']/g, "'").trim();

export function LibraryClient({ terms, meta }: { terms: LibraryTerm[]; meta: { updatedAt: string; notice: string } }) {
  const t = useT();
  const locale = useLocale();
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<LibraryTerm | null>(null);
  const cats = React.useMemo(() => Array.from(new Set(terms.map((it) => it.category))), [terms]);
  const list = terms.filter((it) => (!cat || it.category === cat) && (!q || [it.term, it.simple, ...it.aliases].some((v) => norm(v).includes(norm(q)))));
  const byId = (id: string) => terms.find((it) => it.id === id);

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={BookOpen} name="MEDAI · Kutubxona" title={t("{n} ta tibbiy atama oddiy tilda", { n: terms.length })} text="Tahlil koʻrsatkichlari va keng tarqalgan atamalar: oddiy tushuntirish, tibbiy izoh, shifokorga savollar va manbalar." />
      <DemoNote>{t(meta.notice)} {t("Yangilangan sana:")} {meta.updatedAt}.</DemoNote>
      {locale !== "uz" && <p className="rounded-xl bg-sky-50 dark:bg-sky-900/20 px-3 py-2 text-xs text-sky-800 dark:text-sky-200">{t("Kutubxona maqolalari va demo javoblar hozircha faqat oʻzbek tilida. AI rejimida (OpenAI kaliti bilan) javob tanlangan tilda beriladi.")}</p>}

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Atamani qidiring: gemoglobin, ALT, xolesterin…")} aria-label={t("Atama qidirish")} className="input-base pl-10" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={!cat} onClick={() => setCat(null)}>{t("Barchasi (")}{terms.length})</Chip>
        {cats.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{t(c)}</Chip>)}
      </div>

      {list.length === 0 ? (
        <p className="card-base p-6 text-center text-sm text-slate-500">“{q}{t("” boʻyicha atama topilmadi.")} <Link href="/assistant" className="text-teal-700 dark:text-teal-400 underline">{t("MEDAI dan soʻrang")}</Link>.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((it) => (
            <button key={it.id} type="button" onClick={() => setOpen(it)} className="card-base p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">{t(it.category)}</span>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{it.term}</p>
              <p className="mt-1 line-clamp-3 text-sm text-slate-500">{it.simple}</p>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.term || ""} wide>
        {open && (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <span className="rounded-full bg-teal-50 dark:bg-teal-900/30 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-400">{t(open.category)}</span>
            <section><h4 className="font-bold text-slate-900 dark:text-white">{t("Oddiy tilda")}</h4><p className="mt-1 leading-relaxed">{open.simple}</p></section>
            <section><h4 className="font-bold text-slate-900 dark:text-white">{t("Tibbiy izoh")}</h4><p className="mt-1 leading-relaxed">{open.medical}</p></section>
            {open.warning && <p className="flex gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 p-3 text-xs text-amber-800 dark:text-amber-300"><AlertTriangle className="h-4 w-4 shrink-0" />{open.warning}</p>}
            {!!open.doctorQuestions?.length && (
              <section><h4 className="font-bold text-slate-900 dark:text-white">{t("Shifokorga beriladigan savollar")}</h4>
                <ul className="mt-1 list-disc pl-5 space-y-1">{open.doctorQuestions.map((d) => <li key={d}>{d}</li>)}</ul></section>
            )}
            {!!open.related?.length && (
              <section><h4 className="font-bold text-slate-900 dark:text-white">{t("Bogʻliq atamalar")}</h4>
                <div className="mt-1 flex flex-wrap gap-2">{open.related.map((r) => { const rel = byId(r); return rel ? <Chip key={r} onClick={() => setOpen(rel)}>{rel.term}</Chip> : null; })}</div></section>
            )}
            {!!open.sources?.length && (
              <section><h4 className="font-bold text-slate-900 dark:text-white">{t("Manbalar (qoʻshimcha oʻqish)")}</h4>
                <ul className="mt-1 space-y-1">{open.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 underline">{t(s.title)} <ExternalLink className="h-3 w-3" /></a> <span className="text-xs text-slate-400">— {t(s.org)}</span></li>)}</ul></section>
            )}
            <Link href="/assistant"><Button variant="gradient" className="w-full mt-2"><MessageSquare className="h-4 w-4" /> {t("MEDAI dan batafsil soʻrash")}</Button></Link>
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Search, AlertTriangle, MessageSquare, ExternalLink } from "lucide-react";
import type { LibraryTerm } from "@/lib/medai";
import { Button } from "@/components/ui/button";
import { Chip, DemoNote, Modal, ModuleHero } from "@/components/modules/common";

const norm = (s: string) => s.toLowerCase().replace(/[ʻʼ‘’`']/g, "'").trim();

export function LibraryClient({ terms, meta }: { terms: LibraryTerm[]; meta: { updatedAt: string; notice: string } }) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<LibraryTerm | null>(null);
  const cats = React.useMemo(() => Array.from(new Set(terms.map((t) => t.category))), [terms]);
  const list = terms.filter((t) => (!cat || t.category === cat) && (!q || [t.term, t.simple, ...t.aliases].some((v) => norm(v).includes(norm(q)))));
  const byId = (id: string) => terms.find((t) => t.id === id);

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={BookOpen} name="MEDAI · Kutubxona" title={`${terms.length} ta tibbiy atama oddiy tilda`} text="Tahlil koʻrsatkichlari va keng tarqalgan atamalar: oddiy tushuntirish, tibbiy izoh, shifokorga savollar va manbalar." />
      <DemoNote>{meta.notice} Yangilangan sana: {meta.updatedAt}.</DemoNote>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Atamani qidiring: gemoglobin, ALT, xolesterin…" aria-label="Atama qidirish" className="input-base pl-10" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip active={!cat} onClick={() => setCat(null)}>Barchasi ({terms.length})</Chip>
        {cats.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>

      {list.length === 0 ? (
        <p className="card-base p-6 text-center text-sm text-slate-500">“{q}” boʻyicha atama topilmadi. <Link href="/assistant" className="text-teal-700 underline">MEDAI dan soʻrang</Link>.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <button key={t.id} type="button" onClick={() => setOpen(t)} className="card-base p-4 text-left transition hover:-translate-y-0.5 hover:shadow-card">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-600">{t.category}</span>
              <p className="mt-0.5 font-bold text-slate-900 dark:text-white">{t.term}</p>
              <p className="mt-1 line-clamp-3 text-sm text-slate-500">{t.simple}</p>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.term || ""} wide>
        {open && (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">{open.category}</span>
            <section><h4 className="font-bold text-slate-900 dark:text-white">Oddiy tilda</h4><p className="mt-1 leading-relaxed">{open.simple}</p></section>
            <section><h4 className="font-bold text-slate-900 dark:text-white">Tibbiy izoh</h4><p className="mt-1 leading-relaxed">{open.medical}</p></section>
            {open.warning && <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />{open.warning}</p>}
            {!!open.doctorQuestions?.length && (
              <section><h4 className="font-bold text-slate-900 dark:text-white">Shifokorga beriladigan savollar</h4>
                <ul className="mt-1 list-disc pl-5 space-y-1">{open.doctorQuestions.map((d) => <li key={d}>{d}</li>)}</ul></section>
            )}
            {!!open.related?.length && (
              <section><h4 className="font-bold text-slate-900 dark:text-white">Bogʻliq atamalar</h4>
                <div className="mt-1 flex flex-wrap gap-2">{open.related.map((r) => { const t = byId(r); return t ? <Chip key={r} onClick={() => setOpen(t)}>{t.term}</Chip> : null; })}</div></section>
            )}
            {!!open.sources?.length && (
              <section><h4 className="font-bold text-slate-900 dark:text-white">Manbalar (qoʻshimcha oʻqish)</h4>
                <ul className="mt-1 space-y-1">{open.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-teal-700 underline">{s.title} <ExternalLink className="h-3 w-3" /></a> <span className="text-xs text-slate-400">— {s.org}</span></li>)}</ul></section>
            )}
            <Link href="/assistant"><Button variant="gradient" className="w-full mt-2"><MessageSquare className="h-4 w-4" /> MEDAI dan batafsil soʻrash</Button></Link>
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import * as React from "react";
import { ShieldPlus, ShieldCheck, ShieldAlert, Plus, X, Copy as CopyIcon, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, DemoNote, ModuleHero } from "@/components/modules/common";

interface Finding { a: string; b: string; aLabel: string; bLabel: string; severity: "high" | "moderate" | "duplicate"; effect: string; advice: string }
interface Result { findings: Finding[]; recognized: { raw: string; label: string }[]; unknown: string[] }

const SEV = {
  high: { label: "Xavfli birikma", cls: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20", pill: "bg-red-600 text-white", icon: ShieldAlert },
  duplicate: { label: "Takroriy faol modda", cls: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20", pill: "bg-red-600 text-white", icon: CopyIcon },
  moderate: { label: "Ehtiyot boʻling", cls: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20", pill: "bg-amber-500 text-white", icon: ShieldAlert },
} as const;

const EXAMPLES = [["Ibuprofen", "Aspirin"], ["Varfarin", "Diklofenak"], ["Paracetamol", "Panadol"], ["Metformin", "Spirtli ichimlik"]];

export function InteractionsClient() {
  const t = useT();
  const [mine, setMine] = React.useState<{ medications: string[]; result: Result } | null>(null);
  const [list, setList] = React.useState<string[]>([]);
  const [input, setInput] = React.useState("");
  const [res, setRes] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [coverage, setCoverage] = React.useState<{ ingredients: number; rules: number } | null>(null);

  React.useEffect(() => {
    api<{ medications: string[]; result: Result; coverage: { ingredients: number; rules: number } }>("/api/interactions")
      .then((r) => { setMine(r); setCoverage(r.coverage); }).catch((e) => setError(t(e.message)));
  }, [t]);

  const add = (name?: string) => {
    const v = (name ?? input).trim();
    if (!v || list.includes(v) || list.length >= 20) return;
    setList((l) => [...l, v]); setInput(""); setRes(null);
  };
  const check = async (drugs = list) => {
    setError(null);
    try { setRes((await api<{ result: Result }>("/api/interactions", { method: "POST", json: { drugs } })).result); }
    catch (e: any) { setError(t(e.message)); }
  };
  const tryExample = (ex: string[]) => { setList(ex); check(ex); };

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={ShieldPlus} name="Salomatligim" title={t("Dorilar birga ichsa boʻladimi?")} text="Qabul qilayotgan dorilaringizni tekshiraman: xavfli birikmalar va bir xil faol moddaning takrorlanishi. Savdo, rus va ingliz nomlarini ham taniyman." />

      <section className="card-base p-4 space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-white">{t("Eslatmalaringizdagi dorilar")}</h3>
        {!mine ? <LoadingCard /> : mine.medications.length < 2 ? (
          <p className="text-sm text-slate-500">{t("Tekshirish uchun kamida 2 ta dori kerak. Pastda qoʻlda kiriting yoki dori eslatmasi qoʻshing.")}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">{mine.medications.map((m) => <span key={m} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200">{m}</span>)}</div>
            <Findings r={mine.result} />
          </>
        )}
      </section>

      <section className="card-base p-4 space-y-3">
        <h3 className="font-bold text-slate-900 dark:text-white">{t("Boshqa dorilarni tekshirish")}</h3>
        <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
          <input className="input-base flex-1" value={input} onChange={(e) => setInput(e.target.value)} maxLength={80} placeholder={t("Dori nomi: masalan, Nurofen yoki ибупрофен")} aria-label={t("Dori nomi")} />
          <Button type="submit" variant="outline" size="icon" aria-label={t("Qoʻshish")}><Plus className="h-4 w-4" /></Button>
        </form>
        {list.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {list.map((m) => (
              <span key={m} className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-900/30 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300">
                {m}<button type="button" onClick={() => { setList((l) => l.filter((x) => x !== m)); setRes(null); }} aria-label={t("Oʻchirish")}><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="gradient" disabled={list.length < 2} onClick={() => check()}>{t("Tekshirish")}</Button>
          <span className="text-xs text-slate-400">{t("Sinab koʻring:")}</span>
          {EXAMPLES.map((ex) => <button key={ex.join()} type="button" onClick={() => tryExample(ex)} className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:border-teal-400">{ex.map((x) => t(x)).join(" + ")}</button>)}
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {res && <Findings r={res} />}
      </section>

      <DemoNote>{t("Cheklangan namunaviy roʻyxat: {i} ta faol modda va {r} ta keng maʼlum oʻzaro taʼsir. Roʻyxatda yoʻqligi xavfsiz degani emas — har doim farmatsevt yoki shifokor bilan tekshiring. Doza tavsiya qilinmaydi.", { i: coverage?.ingredients ?? "…", r: coverage?.rules ?? "…" })}</DemoNote>
    </div>
  );
}

function Findings({ r }: { r: Result }) {
  const t = useT();
  return (
    <div className="space-y-2">
      {r.findings.length === 0 ? (
        <p className="flex items-start gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-3 text-sm text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          {r.recognized.length >= 2 ? t("Bizning roʻyxatimizda bu dorilar orasida maʼlum xavfli birikma topilmadi. Baribir farmatsevt bilan tekshiring.") : t("Tekshirish uchun kamida ikkita tanilgan dori kerak.")}
        </p>
      ) : r.findings.map((f, i) => {
        const s = SEV[f.severity];
        return (
          <article key={i} className={cn("rounded-2xl border p-3.5", s.cls)}>
            <div className="flex flex-wrap items-center gap-2">
              <s.icon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <b className="text-sm text-slate-900 dark:text-white">{t(f.aLabel)} + {t(f.bLabel)}</b>
              <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold", s.pill)}>{t(s.label)}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-200">{t(f.effect)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{t(f.advice)}</p>
          </article>
        );
      })}
      {r.unknown.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-slate-500"><HelpCircle className="h-4 w-4 shrink-0" />{t("Tanilmadi (roʻyxatimizda yoʻq):")} {r.unknown.join(", ")}</p>
      )}
    </div>
  );
}

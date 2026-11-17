"use client";

import * as React from "react";
import Link from "next/link";
import { HeartPulse, ArrowLeft, RotateCcw, Lightbulb, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, DemoNote, EmergencyBanner, ModuleHero, useFormat } from "@/components/modules/common";

interface Q { id: string; text: string; areas: string[]; options: { label: string; score: number; flag?: string }[] }
interface AreaScore { id: string; label: string; score: number }
interface Result { score: number; areas: AreaScore[]; flags: { question: string; answer: string; flag: "urgent" | "emergency" }[]; tips: { area: string; text: string }[]; emergency: boolean }
interface Hist { id: string; score: number; areas: AreaScore[]; createdAt: string }

const band = (s: number) => (s >= 80 ? { label: "Yaxshi", color: "#10B981" } : s >= 60 ? { label: "Oʻrtacha — eʼtibor bering", color: "#F59E0B" } : { label: "Eʼtibor talab qiladi", color: "#DC2626" });

export function CheckupClient() {
  const t = useT();
  const fmt = useFormat();
  const [qs, setQs] = React.useState<Q[] | null>(null);
  const [hist, setHist] = React.useState<Hist[]>([]);
  const [step, setStep] = React.useState(-1); // -1: kirish, 0..n-1: savollar
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => api<{ questions: Q[]; history: Hist[] }>("/api/checkup").then((r) => { setQs(r.questions); setHist(r.history); }).catch((e) => setError(t(e.message))), [t]);
  React.useEffect(() => { load(); }, [load]);

  const choose = async (qid: string, idx: number) => {
    const next = { ...answers, [qid]: idx };
    setAnswers(next);
    if (!qs) return;
    if (step < qs.length - 1) { setStep(step + 1); return; }
    try { setResult(await api<Result>("/api/checkup", { method: "POST", json: { answers: next } })); setStep(-2); load(); }
    catch (e: any) { setError(t(e.message)); }
  };
  const restart = () => { setAnswers({}); setResult(null); setStep(0); setError(null); };

  if (!qs) return <div className="p-4">{error ? <p className="text-sm text-red-600">{error}</p> : <LoadingCard />}</div>;
  const last = hist[0];

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={HeartPulse} name="Salomatligim" title={t("Chekap — 1 daqiqada salomatlik balli")} text="12 ta qisqa savol. Yurak, hazm, tayanch-harakat, asab tizimi va immunitet boʻyicha 0–100 ball hamda nimaga eʼtibor berish kerakligi." />

      {step === -1 && (
        <section className="card-base p-5 space-y-4">
          {last ? (
            <div className="flex flex-wrap items-center gap-5">
              <ScoreRing score={last.score} />
              <div className="flex-1 min-w-[200px] space-y-1">
                <p className="text-sm text-slate-500">{t("Oxirgi chekap:")} {fmt.day(last.createdAt)}</p>
                <p className="font-bold" style={{ color: band(last.score).color }}>{t(band(last.score).label)}</p>
                <AreaBars areas={last.areas} />
              </div>
            </div>
          ) : <p className="text-sm text-slate-500">{t("Siz hali chekapdan oʻtmagansiz. Savollar turmush tarzi va shikoyatlar haqida — javoblar faqat sizga koʻrinadi.")}</p>}
          <Button variant="gradient" onClick={restart}>{last ? t("Chekapni qayta oʻtish") : t("Chekapni boshlash")}</Button>
          {hist.length > 1 && <Trend hist={hist} fmtDay={fmt.dayNoYear} />}
        </section>
      )}

      {step >= 0 && qs[step] && (
        <section className="card-base p-5 space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep(step - 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("Orqaga")}><ArrowLeft className="h-4 w-4" /></button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${((step + 1) / qs.length) * 100}%` }} /></div>
            <span className="text-xs font-semibold text-slate-400">{step + 1}/{qs.length}</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t(qs[step].text)}</h2>
          <div className="grid gap-2">
            {qs[step].options.map((o, i) => (
              <button key={o.label} type="button" onClick={() => choose(qs[step].id, i)}
                className={cn("rounded-2xl border px-4 py-3 text-left text-sm font-medium transition hover:border-teal-400", answers[qs[step].id] === i ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200")}>
                {t(o.label)}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </section>
      )}

      {step === -2 && result && (
        <section className="space-y-4">
          {result.emergency && <EmergencyBanner />}
          {result.flags.some((f) => f.flag === "urgent") && !result.emergency && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 p-3.5 text-sm text-amber-900 dark:text-amber-200">
              <p className="font-bold">{t("Bu javoblarni shifokor bilan muhokama qiling:")}</p>
              <ul className="mt-1 list-disc pl-5">{result.flags.filter((f) => f.flag === "urgent").map((f) => <li key={f.question}>{t(f.question)} — {t(f.answer)}</li>)}</ul>
              <Link href="/connect" className="mt-2 inline-block font-semibold underline">{t("Shifokorga yozilish")}</Link>
            </div>
          )}
          <div className="card-base p-5 flex flex-wrap items-center gap-5">
            <ScoreRing score={result.score} />
            <div className="flex-1 min-w-[200px] space-y-1">
              <p className="font-bold" style={{ color: band(result.score).color }}>{t(band(result.score).label)}</p>
              <AreaBars areas={result.areas} />
            </div>
          </div>
          {result.tips.length > 0 && (
            <div className="card-base p-5">
              <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Lightbulb className="h-4 w-4 text-amber-500" />{t("Nimaga eʼtibor berish kerak")}</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">{result.tips.map((tip) => <li key={tip.text}><b className="text-slate-800 dark:text-slate-100">{t(tip.area)}:</b> {t(tip.text)}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={restart}><RotateCcw className="h-4 w-4" /> {t("Qayta oʻtish")}</Button>
            <Link href="/connect"><Button variant="gradient"><CalendarDays className="h-4 w-4" /> {t("Shifokorga yozilish")}</Button></Link>
          </div>
        </section>
      )}

      <DemoNote>{t("Ball turmush tarzi va shikoyatlarga asoslangan qoidaviy hisob — tashxis emas. Davriy tibbiy koʻrikni shifokor bilan rejalashtiring.")}</DemoNote>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const t = useT();
  const R = 52, C = 2 * Math.PI * R, b = band(score);
  return (
    <svg viewBox="0 0 130 130" className="h-32 w-32 shrink-0" role="img" aria-label={t("Salomatlik balli: {n}", { n: score })}>
      <circle cx="65" cy="65" r={R} fill="none" strokeWidth="12" className="stroke-slate-100 dark:stroke-slate-800" />
      <circle cx="65" cy="65" r={R} fill="none" stroke={b.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(score / 100) * C} ${C}`} transform="rotate(-90 65 65)" />
      <text x="65" y="66" textAnchor="middle" fontSize="32" fontWeight="800" className="fill-slate-900 dark:fill-white">{score}</text>
      <text x="65" y="86" textAnchor="middle" fontSize="11" className="fill-slate-400">/ 100</text>
    </svg>
  );
}

function AreaBars({ areas }: { areas: AreaScore[] }) {
  const t = useT();
  return (
    <ul className="space-y-1.5">
      {areas.map((a) => (
        <li key={a.id} className="text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-300"><span>{t(a.label)}</span><b>{a.score}</b></div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full" style={{ width: `${a.score}%`, background: band(a.score).color }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Trend({ hist, fmtDay }: { hist: Hist[]; fmtDay: (d: string) => string }) {
  const t = useT();
  const pts = [...hist].slice(0, 10).reverse();
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{t("Dinamika")}</p>
      <div className="flex items-end gap-2 h-24">
        {pts.map((h) => (
          <div key={h.id} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500">{h.score}</span>
            <div className="w-full max-w-8 rounded-t-md" style={{ height: `${Math.max(6, h.score * 0.6)}px`, background: band(h.score).color }} />
            <span className="text-[10px] text-slate-400">{fmtDay(h.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Lightbulb, CalendarDays, Stethoscope, FileText, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, DemoNote, EmergencyBanner, useFormat } from "@/components/modules/common";

interface Q { id: string; text: string; areas: string[]; options: { label: string; score: number; flag?: string }[] }
interface AreaScore { id: string; label: string; score: number }
interface Hist { id: string; score: number; areas: AreaScore[]; createdAt: string; doctorName: string | null; conclusion: string | null; flags: { question: string; answer: string; flag: "urgent" | "emergency" }[]; tips: { area: string; text: string }[]; emergency: boolean }

const band = (s: number) => (s >= 80 ? { label: "Yaxshi", color: "#10B981" } : s >= 60 ? { label: "Oʻrtacha — eʼtibor bering", color: "#F59E0B" } : { label: "Eʼtibor talab qiladi", color: "#DC2626" });

/**
 * Chekap. Bemor faqat natijani ko'radi (chekapni shifokor o'tkazadi).
 * Shifokor rejimi (patientId berilganda): savollarni bemor bilan birga to'ldiradi va xulosa yozadi.
 */
export function CheckupPanel({ patientId }: { patientId?: string }) {
  const t = useT();
  const fmt = useFormat();
  const isDoctor = !!patientId;
  const url = patientId ? `/api/doctor/patients/${patientId}/checkup` : "/api/checkup";
  const [qs, setQs] = React.useState<Q[] | null>(null);
  const [hist, setHist] = React.useState<Hist[]>([]);
  const [step, setStep] = React.useState(-1); // -1: natija, 0..n-1: savollar, n: xulosa
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [conclusion, setConclusion] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => api<{ questions: Q[]; history: Hist[] }>(url).then((r) => { setQs(r.questions); setHist(r.history); }).catch((e) => setError(t(e.message))), [t, url]);
  React.useEffect(() => { load(); }, [load]);

  const choose = (qid: string, idx: number) => {
    setAnswers({ ...answers, [qid]: idx });
    setStep(step + 1);
  };
  const save = async () => {
    setBusy(true); setError(null);
    try { await api(url, { method: "POST", json: { answers, conclusion } }); setStep(-1); setAnswers({}); setConclusion(""); load(); }
    catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };
  const start = () => { setAnswers({}); setConclusion(""); setStep(0); setError(null); };

  if (!qs) return <div>{error ? <p className="text-sm text-red-600">{error}</p> : <LoadingCard />}</div>;
  const last = hist[0];

  return (
    <div className="space-y-4">
      {step === -1 && (
        <>
          {!isDoctor && (
            <p className="flex items-center gap-2 rounded-2xl bg-teal-50 dark:bg-teal-900/20 p-3 text-sm text-teal-800 dark:text-teal-200">
              <Stethoscope className="h-4 w-4 shrink-0" />{t("Chekapni shifokoringiz qabulda oʻtkazadi. Bu yerda natija, shifokor xulosasi va maslahatlarni koʻrasiz.")}
            </p>
          )}
          {last?.emergency && <EmergencyBanner />}
          <section className="card-base p-5 space-y-4">
            {last ? (
              <>
                <div className="flex flex-wrap items-center gap-5">
                  <ScoreRing score={last.score} />
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <p className="text-sm text-slate-500">{t("Oxirgi chekap:")} {fmt.day(last.createdAt)}{last.doctorName ? <> · {t("Shifokor:")} <b className="text-slate-700 dark:text-slate-200">{t(last.doctorName)}</b></> : null}</p>
                    <p className="font-bold" style={{ color: band(last.score).color }}>{t(band(last.score).label)}</p>
                    <AreaBars areas={last.areas} />
                  </div>
                </div>
                {last.conclusion && (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3.5 text-sm">
                    <p className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100"><FileText className="h-4 w-4 text-teal-600" />{t("Shifokor xulosasi")}</p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{t(last.conclusion)}</p>
                  </div>
                )}
                {last.flags.some((f) => f.flag === "urgent") && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 p-3.5 text-sm text-amber-900 dark:text-amber-200">
                    <p className="font-bold">{t("Eʼtibor talab qiladigan javoblar:")}</p>
                    <ul className="mt-1 list-disc pl-5">{last.flags.filter((f) => f.flag === "urgent").map((f) => <li key={f.question}>{t(f.question)} — {t(f.answer)}</li>)}</ul>
                  </div>
                )}
                {last.tips.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Lightbulb className="h-4 w-4 text-amber-500" />{t("Nimaga eʼtibor berish kerak")}</h3>
                    <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">{last.tips.map((tip) => <li key={tip.text}><b className="text-slate-800 dark:text-slate-100">{t(tip.area)}:</b> {t(tip.text)}</li>)}</ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">{isDoctor ? t("Bu bemor hali chekapdan oʻtmagan.") : t("Siz hali chekapdan oʻtmagansiz. Chekap shifokor qabulida oʻtkaziladi.")}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {isDoctor
                ? <Button variant="gradient" onClick={start}><ClipboardCheck className="h-4 w-4" /> {t("Chekap oʻtkazish")}</Button>
                : <Link href="/connect"><Button variant={last ? "outline" : "gradient"}><CalendarDays className="h-4 w-4" /> {t("Shifokorga yozilish")}</Button></Link>}
            </div>
            {hist.length > 1 && <Trend hist={hist} fmtDay={fmt.dayNoYear} />}
          </section>
        </>
      )}

      {step >= 0 && step < qs.length && (
        <section className="card-base p-5 space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep(step - 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("Orqaga")}><ArrowLeft className="h-4 w-4" /></button>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${((step + 1) / (qs.length + 1)) * 100}%` }} /></div>
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
        </section>
      )}

      {isDoctor && step === qs.length && (
        <section className="card-base p-5 space-y-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setStep(step - 1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("Orqaga")}><ArrowLeft className="h-4 w-4" /></button>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("Shifokor xulosasi")}</h2>
          </div>
          <textarea className="input-base min-h-[120px]" maxLength={1000} value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder={t("Umumiy holat, tavsiyalar, keyingi tekshiruvlar…")} aria-label={t("Shifokor xulosasi")} />
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(-1)}><RotateCcw className="h-4 w-4" /> {t("Bekor qilish")}</Button>
            <Button variant="gradient" onClick={save} disabled={busy}><ClipboardCheck className="h-4 w-4" /> {t("Saqlash va bemorga yuborish")}</Button>
          </div>
        </section>
      )}

      <DemoNote>{t("Ball turmush tarzi va shikoyatlarga asoslangan qoidaviy hisob — tashxis emas.")}</DemoNote>
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

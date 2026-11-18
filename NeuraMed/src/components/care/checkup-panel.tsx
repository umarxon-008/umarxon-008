"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Lightbulb, CalendarDays, FileText, ClipboardCheck, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, EmergencyBanner, useFormat } from "@/components/modules/common";

interface Q { id: string; text: string; areas: string[]; options: { label: string; score: number; flag?: string }[] }
interface AreaScore { id: string; label: string; score: number }
interface Note { id: string; doctorName: string; text: string; createdAt: string }
interface Hist { id: string; score: number; areas: AreaScore[]; createdAt: string; doctorName: string | null; conclusion: string | null; diagnosis: string | null; notes: Note[]; flags: { question: string; answer: string; flag: "urgent" | "emergency" }[]; tips: { area: string; text: string }[]; emergency: boolean }

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
  const [diagnosis, setDiagnosis] = React.useState("");
  const [selId, setSelId] = React.useState<string | null>(null);
  const [noteText, setNoteText] = React.useState("");
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
    try { await api(url, { method: "POST", json: { answers, conclusion, diagnosis } }); setStep(-1); setAnswers({}); setConclusion(""); setDiagnosis(""); setSelId(null); load(); }
    catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };
  const start = () => { setAnswers({}); setConclusion(""); setDiagnosis(""); setStep(0); setError(null); };
  const addNote = async (checkupId: string) => {
    setBusy(true); setError(null);
    try { await api(`${url}/notes`, { method: "POST", json: { checkupId, text: noteText } }); setNoteText(""); load(); }
    catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };

  if (!qs) return <div>{error ? <p className="text-sm text-red-600">{error}</p> : <LoadingCard />}</div>;
  const last = hist.find((h) => h.id === selId) || hist[0];
  const isLatest = last && last.id === hist[0]?.id;

  return (
    <div className="space-y-4">
      {step === -1 && (
        <>
          {last?.emergency && <EmergencyBanner />}
          {!last ? (
            <section className="card-base flex flex-col items-center gap-3 p-8 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><ClipboardCheck className="h-7 w-7" /></span>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">{isDoctor ? t("Bu bemor hali chekapdan oʻtmagan.") : t("Chekap hali oʻtkazilmagan")}</p>
              {isDoctor
                ? <Button variant="gradient" size="lg" onClick={start}><ClipboardCheck className="h-5 w-5" /> {t("Chekap oʻtkazish")}</Button>
                : <Link href="/connect"><Button variant="gradient" size="lg"><CalendarDays className="h-5 w-5" /> {t("Shifokorga yozilish")}</Button></Link>}
            </section>
          ) : (
            <section className="card-base space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base text-slate-600 dark:text-slate-300">{fmt.day(last.createdAt)}{last.doctorName ? <> · <b className="text-slate-900 dark:text-white">{t(last.doctorName)}</b></> : null}</p>
                {!isLatest && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t("Oldingi chekap")}</span>}
                {isDoctor && <Button variant="gradient" className="ml-auto" onClick={start}><ClipboardCheck className="h-5 w-5" /> {t("Chekap oʻtkazish")}</Button>}
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <ScoreRing score={last.score} />
                <div className="min-w-[220px] flex-1 space-y-2">
                  <p className="text-lg font-bold" style={{ color: band(last.score).color }}>{t(band(last.score).label)}</p>
                  <AreaBars areas={last.areas} />
                </div>
              </div>
              {last.diagnosis && (
                <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4 dark:border-primary-900 dark:bg-primary-900/20">
                  <p className="text-sm font-bold uppercase tracking-wide text-primary-700 dark:text-primary-300">{t("Tashxis")}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{t(last.diagnosis)}</p>
                </div>
              )}
              {last.conclusion && (
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <p className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><FileText className="h-5 w-5 text-primary-600" />{t("Shifokor xulosasi")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-base text-slate-700 dark:text-slate-200">{t(last.conclusion)}</p>
                </div>
              )}
              {(last.notes.length > 0 || isDoctor) && (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><MessageSquareText className="h-5 w-5 text-primary-600" />{t("Shifokor izohlari")}</p>
                  {last.notes.length === 0 && <p className="text-base text-slate-500">{t("Hali izoh yoʻq.")}</p>}
                  <ul className="space-y-2">
                    {last.notes.map((n) => (
                      <li key={n.id} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                        <p className="whitespace-pre-wrap text-base text-slate-800 dark:text-slate-100">{n.text}</p>
                        <p className="mt-1 text-sm text-slate-500">{t(n.doctorName)} · {fmt.dayNoYear(n.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                  {isDoctor && (
                    <form onSubmit={(e) => { e.preventDefault(); addNote(last.id); }} className="flex flex-col gap-2 sm:flex-row">
                      <textarea className="input-base min-h-[52px] flex-1 text-base" maxLength={1000} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder={t("Bemorga izoh yozing…")} aria-label={t("Izoh")} />
                      <Button type="submit" variant="gradient" disabled={busy || !noteText.trim()}>{t("Izoh qoʻshish")}</Button>
                    </form>
                  )}
                </div>
              )}
              {last.flags.some((f) => f.flag === "urgent") && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                  <p className="font-bold">{t("Eʼtibor talab qiladigan javoblar:")}</p>
                  <ul className="mt-1 list-disc pl-5">{last.flags.filter((f) => f.flag === "urgent").map((f) => <li key={f.question}>{t(f.question)} — {t(f.answer)}</li>)}</ul>
                </div>
              )}
              {last.tips.length > 0 && (
                <details className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <summary className="flex cursor-pointer items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><Lightbulb className="h-5 w-5 text-amber-500" />{t("Nimaga eʼtibor berish kerak")}</summary>
                  <ul className="mt-3 space-y-2 text-base text-slate-700 dark:text-slate-200">{last.tips.map((tip) => <li key={tip.text}><b className="text-slate-900 dark:text-white">{t(tip.area)}:</b> {t(tip.text)}</li>)}</ul>
                </details>
              )}
              {error && <p role="alert" className="text-base text-red-600 dark:text-red-400">{error}</p>}
            </section>
          )}

          {hist.length > 1 && (
            <section className="card-base p-5">
              <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{t("Chekaplar tarixi")}</h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {hist.map((h) => (
                  <li key={h.id}>
                    <button type="button" onClick={() => setSelId(h.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left", h.id === last?.id ? "bg-primary-50 dark:bg-primary-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
                      <span className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white" style={{ background: band(h.score).color }}>{h.score}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-slate-900 dark:text-white">{h.doctorName ? t(h.doctorName) : t("Shifokor")}</span>
                        <span className="block truncate text-sm text-slate-600 dark:text-slate-300">{fmt.day(h.createdAt)}{h.diagnosis ? ` · ${t(h.diagnosis)}` : ""}</span>
                      </span>
                      {h.notes.length > 0 && <span className="inline-flex items-center gap-1 text-sm text-slate-500"><MessageSquareText className="h-4 w-4" />{h.notes.length}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("Tashxis va xulosa")}</h2>
          </div>
          <label className="block"><span className="label-base">{t("Tashxis")}</span><input className="input-base text-base" maxLength={300} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder={t("Masalan: Temir tanqisligi anemiyasi, yengil daraja")} /></label>
          <span className="label-base">{t("Shifokor xulosasi")}</span>
          <textarea className="input-base min-h-[120px]" maxLength={1000} value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder={t("Umumiy holat, tavsiyalar, keyingi tekshiruvlar…")} aria-label={t("Shifokor xulosasi")} />
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStep(-1)}><RotateCcw className="h-4 w-4" /> {t("Bekor qilish")}</Button>
            <Button variant="gradient" onClick={save} disabled={busy}><ClipboardCheck className="h-4 w-4" /> {t("Saqlash va bemorga yuborish")}</Button>
          </div>
        </section>
      )}

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

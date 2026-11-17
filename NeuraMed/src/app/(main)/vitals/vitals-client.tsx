"use client";

import * as React from "react";
import { Activity, Plus, Trash2, HeartPulse, Gauge, Droplets, Scale, Thermometer, Wind, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, Chip, DemoNote, EmergencyBanner, Modal, ModuleHero, Toast, useFormat } from "@/components/modules/common";

type Level = "ok" | "info" | "warn" | "danger";
interface Msg { text: string; vars?: Record<string, string | number> }
interface Assessment { level: Level; title: Msg; advice: Msg[]; emergency: boolean }
interface Reading { id: string; value: number; value2: number | null; at: string; note: string | null }
interface Series { type: string; label: string; unit: string; min: number; max: number; min2?: number; max2?: number; step: number; readings: Reading[]; latest: { value: number; value2: number | null; at: string; assessment: Assessment } | null }
interface Data { series: Series[]; alerts: (Assessment & { type: string; label: string })[] }

const ICON: Record<string, React.ElementType> = { bp: Gauge, pulse: HeartPulse, glucose: Droplets, weight: Scale, temp: Thermometer, spo2: Wind, sleep: Moon };
const TONE: Record<Level, string> = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};
const fmtVal = (s: { type: string }, v: number, v2: number | null) => (s.type === "bp" ? `${Math.round(v)}/${Math.round(v2 ?? 0)}` : String(Math.round(v * 10) / 10));

export function VitalsClient() {
  const t = useT();
  const fmt = useFormat();
  const [d, setD] = React.useState<Data | null>(null);
  const [sel, setSel] = React.useState("bp");
  const [adding, setAdding] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Assessment | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => api<Data>("/api/vitals").then(setD).catch((e) => setError(t(e.message))), [t]);
  React.useEffect(() => { load(); }, [load]);
  const tm = (m: Msg) => t(m.text, m.vars);

  const remove = async (id: string) => {
    await api(`/api/vitals/${id}`, { method: "DELETE" }).catch(() => {});
    setToast(t("Oʻlchov oʻchirildi")); load();
  };

  if (!d) return <div className="p-4">{error ? <p className="text-sm text-red-600">{error}</p> : <LoadingCard />}</div>;
  const cur = d.series.find((s) => s.type === sel) || d.series[0];
  const emergency = d.alerts.some((a) => a.emergency);

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={Activity} name="Salomatligim" title={t("Koʻrsatkichlar — bitta oʻlchov emas, dinamika")} text="Bosim, puls, qand, vazn, harorat, kislorod va uyquni yozib boring. Odatdagi qiymatingizdan chetga chiqsa, ogohlantiraman."
        right={<Button variant="secondary" size="sm" onClick={() => setAdding(sel)} className="hidden sm:inline-flex"><Plus className="h-4 w-4" /> {t("Oʻlchov qoʻshish")}</Button>} />

      {emergency && <EmergencyBanner />}
      {d.alerts.length > 0 && (
        <ul className="space-y-2">
          {d.alerts.map((a) => (
            <li key={a.type} className={cn("rounded-2xl p-3.5 text-sm", TONE[a.level])}>
              <p className="font-bold">{t(a.label)}: {tm(a.title)}</p>
              {a.advice.slice(0, 2).map((m, i) => <p key={i} className="mt-0.5 text-xs opacity-90">{tm(m)}</p>)}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {d.series.map((s) => {
          const Icon = ICON[s.type] || Activity;
          return (
            <button key={s.type} type="button" onClick={() => setSel(s.type)} aria-pressed={sel === s.type}
              className={cn("card-base p-4 text-left transition hover:shadow-card", sel === s.type && "ring-2 ring-teal-500")}>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"><Icon className="h-4 w-4" /></span>
                <p className="text-xs font-semibold text-slate-500">{t(s.label)}</p>
              </div>
              <p className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">{s.latest ? fmtVal(s, s.latest.value, s.latest.value2) : "—"} <span className="text-xs font-medium text-slate-400">{t(s.unit)}</span></p>
              {s.latest ? <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", TONE[s.latest.assessment.level])}>{s.latest.assessment.level === "ok" ? t("Meʼyorda") : s.latest.assessment.level === "info" ? t("Kuzating") : s.latest.assessment.level === "warn" ? t("Eʼtibor bering") : t("Xavfli")}</span>
                : <span className="mt-1 inline-block text-[11px] text-slate-400">{t("Hali oʻlchov yoʻq")}</span>}
              <Spark s={s} />
            </button>
          );
        })}
      </div>

      <section className="card-base p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-bold text-slate-900 dark:text-white">{t(cur.label)} — {t("dinamika")}</h3>
          <Button variant="gradient" size="sm" onClick={() => setAdding(cur.type)}><Plus className="h-4 w-4" /> {t("Oʻlchov qoʻshish")}</Button>
        </div>
        {cur.readings.length < 2 ? <p className="py-8 text-center text-sm text-slate-400">{t("Grafik uchun kamida 2 ta oʻlchov kerak.")}</p> : <BigChart s={cur} fmtDay={fmt.dayNoYear} t={t} />}
        {cur.latest && (
          <div className={cn("rounded-2xl p-3 text-sm", TONE[cur.latest.assessment.level])}>
            <p className="font-semibold">{tm(cur.latest.assessment.title)}</p>
            {cur.latest.assessment.advice.map((m, i) => <p key={i} className="text-xs mt-0.5">{tm(m)}</p>)}
          </div>
        )}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          {cur.readings.slice(0, 8).map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <span className="w-28 text-xs text-slate-400">{fmt.dayNoYear(r.at)}</span>
              <b className="flex-1 text-slate-800 dark:text-slate-100">{fmtVal(cur, r.value, r.value2)} <span className="text-xs font-normal text-slate-400">{t(cur.unit)}</span></b>
              {r.note && <span className="text-[11px] text-slate-400">{t(r.note)}</span>}
              <button type="button" onClick={() => remove(r.id)} className="p-1.5 text-slate-300 hover:text-red-500" aria-label={t("Oʻchirish")}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </section>

      <DemoNote>{t("Baholash umumqabul qilingan kattalar chegaralariga asoslangan va tashxis emas. Shifokoringiz siz uchun boshqa maqsadli qiymatlarni belgilashi mumkin. Demo hisobdagi oʻlchovlar namunaviy.")}</DemoNote>

      {adding && <AddModal s={d.series.find((x) => x.type === adding)!} series={d.series} onClose={() => setAdding(null)} onSaved={(a) => { setAdding(null); setResult(a); load(); }} />}
      <Modal open={!!result} onClose={() => setResult(null)} title={t("Oʻlchov saqlandi")}>
        {result && (
          <div className="space-y-3">
            {result.emergency && <EmergencyBanner />}
            <div className={cn("rounded-2xl p-3.5", TONE[result.level])}>
              <p className="font-bold">{tm(result.title)}</p>
              {result.advice.map((m, i) => <p key={i} className="mt-1 text-sm">{tm(m)}</p>)}
            </div>
            <Button className="w-full" variant="outline" onClick={() => setResult(null)}>{t("Yopish")}</Button>
          </div>
        )}
      </Modal>
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function AddModal({ s, series, onClose, onSaved }: { s: Series; series: Series[]; onClose: () => void; onSaved: (a: Assessment) => void }) {
  const t = useT();
  const [type, setType] = React.useState(s.type);
  const [v, setV] = React.useState("");
  const [v2, setV2] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const def = series.find((x) => x.type === type)!;
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api<{ assessment: Assessment }>("/api/vitals", { method: "POST", json: { type, value: Number(v.replace(",", ".")), value2: type === "bp" ? Number(v2) : undefined } });
      onSaved(r.assessment);
    } catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={t("Oʻlchov qoʻshish")}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">{series.map((x) => <Chip key={x.type} active={type === x.type} onClick={() => { setType(x.type); setV(""); setV2(""); }}>{t(x.label)}</Chip>)}</div>
        {type === "bp" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="label-base">{t("Yuqori (sistolik)")}</span><input className="input-base" inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} placeholder="120" autoFocus /></label>
            <label className="block"><span className="label-base">{t("Pastki (diastolik)")}</span><input className="input-base" inputMode="numeric" value={v2} onChange={(e) => setV2(e.target.value)} placeholder="80" /></label>
          </div>
        ) : (
          <label className="block"><span className="label-base">{t(def.label)} ({t(def.unit)})</span><input className="input-base" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} autoFocus /></label>
        )}
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button variant="gradient" className="w-full" disabled={!v || busy || (type === "bp" && !v2)} onClick={submit}>{t("Saqlash")}</Button>
      </div>
    </Modal>
  );
}

function Spark({ s }: { s: Series }) {
  const pts = [...s.readings].slice(0, 14).reverse();
  if (pts.length < 2) return null;
  const vals = pts.map((p) => p.value); const lo = Math.min(...vals), hi = Math.max(...vals); const span = hi - lo || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${28 - ((p.value - lo) / span) * 24}`).join(" ");
  return <svg viewBox="0 0 100 30" className="mt-2 h-7 w-full" aria-hidden="true"><polyline points={d} fill="none" stroke="#0F8F84" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" /></svg>;
}

function BigChart({ s, fmtDay, t }: { s: Series; fmtDay: (d: string) => string; t: (x: string) => string }) {
  const pts = [...s.readings].slice(0, 30).reverse();
  const W = 640, H = 220, L = 40, R = 12, T = 12, B = 28;
  const all = pts.flatMap((p) => (p.value2 != null ? [p.value, p.value2] : [p.value]));
  let lo = Math.min(...all), hi = Math.max(...all);
  if (s.type === "bp") { lo = Math.min(lo, 60); hi = Math.max(hi, 150); }
  const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
  const x = (i: number) => L + (i / Math.max(1, pts.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const line = (key: "value" | "value2") => pts.filter((p) => p[key] != null).map((p, i) => `${i ? "L" : "M"}${x(pts.indexOf(p))},${y(p[key] as number)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={t(s.label)}>
      {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-slate-100 dark:stroke-slate-800" /><text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="10" className="fill-slate-400">{Math.round(v * 10) / 10}</text></g>)}
      {s.type === "bp" && <rect x={L} width={W - L - R} y={y(140)} height={Math.max(0, y(90) - y(140))} fill="#10B981" opacity="0.06" />}
      {s.type === "bp" && <line x1={L} x2={W - R} y1={y(140)} y2={y(140)} stroke="#F59E0B" strokeDasharray="4 4" />}
      <path d={line("value")} fill="none" stroke="#0F8F84" strokeWidth="2.5" strokeLinejoin="round" />
      {s.type === "bp" && <path d={line("value2")} fill="none" stroke="#6D28D9" strokeWidth="2.5" strokeLinejoin="round" />}
      {pts.map((p, i) => <circle key={p.id} cx={x(i)} cy={y(p.value)} r={i === pts.length - 1 ? 4.5 : 2.5} fill="#0F8F84"><title>{`${fmtDay(p.at)}: ${fmtVal(s, p.value, p.value2)}`}</title></circle>)}
      {pts.map((p, i) => (i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1) && <text key={`l${p.id}`} x={x(i)} y={H - 8} textAnchor={i === pts.length - 1 ? "end" : i === 0 ? "start" : "middle"} fontSize="10" className="fill-slate-400">{fmtDay(p.at)}</text>)}
    </svg>
  );
}

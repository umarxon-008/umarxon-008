"use client";

import { useT } from "@/i18n/client";
import * as React from "react";
import { Flag, Thermometer, MapPin, Building2, CalendarClock, Hash, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api, DemoBadge, DemoNote, Modal, Toast, useFormat } from "@/components/modules/common";
import { STAGE_ICON, STATE_STYLE, TraceStatusBadge, IssueIcon } from "@/components/modules/trace-ui";
import type { TraceProduct, Quality } from "@/lib/modules/trace";
import { TrustPanel, LocalBadge, type Analog } from "@/components/modules/trust-panel";

const REASONS = ["Qadoq shikastlangan yoki oʻzgartirilgan", "QR kod / partiya raqami mos emas", "Narx yoki sotuv joyi shubhali", "Boshqa sabab"];

export function TraceDetail({ p, quality, analogs, aiEnabled }: { p: TraceProduct; quality: Quality | null; analogs: Analog[]; aiEnabled: boolean }) {
  const t = useT();
  const fmt = useFormat();
  const formatDay = fmt.day;
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api<{ message: string }>("/api/trace/reports", { method: "POST", json: { productId: p.id, reason, note } });
      setOpen(false); setReason(""); setNote(""); setToast(t(r.message));
    } catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };

  const tone = p.status === "suspicious" ? "border-red-200 bg-red-50 dark:bg-red-900/20" : p.status === "pending" ? "border-amber-200 bg-amber-50 dark:bg-amber-900/20" : "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20";

  return (
    <div className="px-4 py-4 space-y-4">
      <section className="card-base p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">{t(p.category)}</p>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{t(p.name)}</h2>
            <p className="text-sm text-slate-500">{t(p.form)} {t("· Faol modda:")} {t(p.substance)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5"><TraceStatusBadge status={p.status} /><LocalBadge local={p.local} /><DemoBadge /></div>
        </div>
        <div className={cn("mt-4 rounded-2xl border p-3.5 text-sm text-slate-700 dark:text-slate-200 flex gap-2", tone)}>
          <Info className="h-4 w-4 shrink-0 mt-0.5" /> <p>{t(p.statusNote)}</p>
        </div>
        <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          {[
            { icon: Building2, k: "Ishlab chiqaruvchi", v: `${t(p.manufacturer.name)}, ${t(p.manufacturer.country)}` },
            { icon: Hash, k: "Partiya / QR", v: `${p.batch} · ${p.qr}` },
            { icon: CalendarClock, k: "Ishlab chiqarilgan", v: formatDay(p.mfgDate) },
            { icon: CalendarClock, k: "Yaroqlilik muddati", v: `${formatDay(p.expiryDate)} (${p.daysLeft >= 0 ? t("{n} kun qoldi", { n: p.daysLeft }) : t("muddati oʻtgan")})` },
          ].map((r) => (
            <div key={r.k} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
              <dt className="flex items-center gap-1.5 text-[11px] text-slate-400"><r.icon className="h-3.5 w-3.5" />{t(r.k)}</dt>
              <dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100 break-words">{r.v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[11px] text-slate-400">{t("Litsenziya:")} {p.manufacturer.license}</p>
      </section>

      {quality && <TrustPanel p={p} q={quality} analogs={analogs} aiEnabled={aiEnabled} />}

      <section className="card-base p-5">
        <h3 className="font-bold text-slate-900 dark:text-white">{t("Taʼminot zanjiri")}</h3>
        <ol className="mt-4 space-y-0">
          {p.chain.map((c, i) => {
            const Icon = STAGE_ICON[c.stage] || Building2;
            const st = STATE_STYLE[c.state];
            return (
              <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {i < p.chain.length - 1 && <span className={cn("absolute left-5 top-11 bottom-1 w-0.5", c.state === "done" ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700")} />}
                <span className={cn("relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full", st.dot)}>{c.state === "issue" ? <IssueIcon className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">{t(c.stageLabel)}</p>
                    <span className="text-[11px] text-slate-400">{t(st.label)}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{t(c.org)}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{t(c.place)}</span>
                    <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />{c.date ? formatDay(c.date) : "—"}</span>
                    <span className="inline-flex items-center gap-1"><Thermometer className="h-3 w-3" />{t(c.temp)}</span>
                  </p>
                  {c.note && <p className={cn("mt-1 text-xs", c.state === "issue" ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-500")}>{t(c.note)}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card-base p-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <p className="font-semibold text-slate-900 dark:text-white">{t("Shubhali holatni koʻrdingizmi?")}</p>
          <p className="text-xs text-slate-500">{t("Qadoq, QR kod yoki sotuv joyi shubhali boʻlsa, xabar bering.")}</p>
        </div>
        <Button variant={p.status === "suspicious" ? "destructive" : "outline"} onClick={() => setOpen(true)}><Flag className="h-4 w-4" /> {t("Xabar berish")}</Button>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title={t("Shubhali holat haqida xabar")}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{t(p.name)} {t("· Partiya")} {p.batch}</p>
          <fieldset className="space-y-2">
            <legend className="label-base">{t("Sabab")}</legend>
            {REASONS.map((r) => (
              <label key={r} className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm cursor-pointer", reason === r ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-slate-200 dark:border-slate-700")}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-teal-600" /> {t(r)}
              </label>
            ))}
          </fieldset>
          <label className="block"><span className="label-base">{t("Izoh (ixtiyoriy)")}</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} className="input-base" placeholder={t("Qayerdan sotib oldingiz, nimasi shubhali…")} /></label>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button variant="gradient" className="w-full" disabled={!reason || busy} onClick={submit}>{t("Yuborish")}</Button>
        </div>
      </Modal>
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}

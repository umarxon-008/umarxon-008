"use client";

import * as React from "react";
import Link from "next/link";
import { Stethoscope, CalendarCheck, Users, MessageCircle, Clock, ArrowRight, BadgeAlert, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, Chip, Kpi, Modal, ModuleHero, Toast, useFormat } from "@/components/modules/common";

interface Patient { id: string; name: string; age: number | null; gender: string | null; appointments: { id: string; date: string; time: string; reason: string | null }[] }
interface Upcoming { id: string; patientId: string; patientName: string; date: string; time: string; reason: string | null; shared: boolean }
interface Data { patients: Patient[]; upcoming: Upcoming[]; today: string; unread: number }
interface Schedule { workDays: number[]; hours: [number, number]; specialty: string; clinicName: string; licenseNo: string; verified: boolean }

/** Shifokor paneli: bugungi va yaqin qabullar, bemorlarim, ish jadvali. */
export function DoctorHome({ name, specialty }: { name: string; specialty: string }) {
  const t = useT();
  const fmt = useFormat();
  const [d, setD] = React.useState<Data | null>(null);
  const [sched, setSched] = React.useState<Schedule | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    api<Data>("/api/doctor/patients").then(setD).catch((e) => setError(t(e.message)));
    api<Schedule>("/api/doctor/schedule").then(setSched).catch(() => {});
  }, [t]);
  React.useEffect(() => { load(); }, [load]);

  if (!d) return <div className="px-4 py-4">{error ? <p className="text-sm text-red-600">{error}</p> : <LoadingCard />}</div>;
  const todays = d.upcoming.filter((a) => a.date === d.today);

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={Stethoscope} name="Shifokor paneli" title={t("Xush kelibsiz, {name}", { name: t(name) })} text={specialty ? t(specialty) : "Bemorlaringiz, qabullar va chekaplar bir joyda."} />

      {sched && !sched.verified && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20 p-3 text-sm text-amber-900 dark:text-amber-200">
          <BadgeAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("Litsenziya tekshirilmagan (demo). Haqiqiy versiyada shifokor hisobi Sogʻliqni saqlash vazirligi reestri orqali tasdiqlanadi.")}{sched.licenseNo ? ` · ${sched.licenseNo}` : ""}</span>
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={CalendarCheck} label={t("Bugungi qabullar")} value={todays.length} tone="teal" />
        <Kpi icon={Clock} label={t("Yaqin qabullar")} value={d.upcoming.length} tone="violet" />
        <Kpi icon={Users} label={t("Bemorlarim")} value={d.patients.length} tone="green" />
        <Kpi icon={MessageCircle} label={t("Yangi xabarlar")} value={d.unread} tone={d.unread ? "amber" : "slate"} />
      </div>

      <section className="card-base p-4 space-y-3">
        <h2 className="font-bold text-slate-900 dark:text-white">{t("Yaqin qabullar")}</h2>
        {d.upcoming.length === 0 && <p className="text-sm text-slate-500">{t("Hozircha qabulga yozilgan bemor yoʻq. Bemorlar MEDCONNECT orqali sizga yoziladi.")}</p>}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {d.upcoming.map((a) => (
            <li key={a.id}>
              <Link href={`/doctor/patients/${a.patientId}`} className="flex items-center gap-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl px-2 -mx-2">
                <span className={cn("rounded-xl px-2.5 py-1.5 text-center text-xs font-bold", a.date === d.today ? "bg-gradient-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>
                  <span className="block">{a.date === d.today ? t("Bugun") : fmt.weekday(a.date)}</span>
                  <span className="block text-sm">{a.time}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900 dark:text-white">{t(a.patientName)}</span>
                  <span className="block truncate text-xs text-slate-500">{a.date === d.today ? "" : `${fmt.day(a.date)} · `}{a.reason ? t(a.reason) : t("Sabab koʻrsatilmagan")}</span>
                </span>
                {!a.shared && <span className="text-[11px] text-slate-400">{t("Ruxsat yoʻq")}</span>}
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card-base p-4 space-y-3">
        <h2 className="font-bold text-slate-900 dark:text-white">{t("Bemorlarim")}</h2>
        {d.patients.length === 0 && <p className="text-sm text-slate-500">{t("Sizga yozilgan va maʼlumotlarini koʻrishga ruxsat bergan bemorlar shu yerda chiqadi.")}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {d.patients.map((p) => (
            <Link key={p.id} href={`/doctor/patients/${p.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 hover:border-teal-300">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary font-bold text-white">{p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join("")}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900 dark:text-white">{t(p.name)}</span>
                <span className="block text-xs text-slate-500">{p.age ? `${p.age} ${t("yosh")} · ` : ""}{t("{n} ta qabul", { n: p.appointments.length })}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </Link>
          ))}
        </div>
      </section>

      {sched && (
        <section className="card-base p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <h2 className="font-bold text-slate-900 dark:text-white">{t("Ish jadvali")}</h2>
            <p className="text-sm text-slate-500">{sched.workDays.map((n) => fmt.weekdayName(n)).join(", ")} · {sched.hours[0]}:00–{sched.hours[1]}:00</p>
            <p className="text-xs text-slate-400">{t("Bemorlar MEDCONNECT'da shu vaqtlar ichidan boʻsh vaqtni tanlaydi.")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Settings2 className="h-4 w-4" /> {t("Oʻzgartirish")}</Button>
        </section>
      )}

      {editing && sched && <ScheduleModal s={sched} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); setToast(t("Ish jadvali saqlandi")); load(); }} />}
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function ScheduleModal({ s, onClose, onSaved }: { s: Schedule; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const fmt = useFormat();
  const [days, setDays] = React.useState<number[]>(s.workDays);
  const [from, setFrom] = React.useState(String(s.hours[0]));
  const [to, setTo] = React.useState(String(s.hours[1]));
  const [error, setError] = React.useState<string | null>(null);
  const save = async () => {
    setError(null);
    try { await api("/api/doctor/schedule", { method: "PATCH", json: { workDays: days, hours: [Number(from), Number(to)] } }); onSaved(); }
    catch (e: any) { setError(t(e.message)); }
  };
  return (
    <Modal open onClose={onClose} title={t("Ish jadvali")}>
      <div className="space-y-3">
        <p className="label-base">{t("Ish kunlari")}</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((n) => <Chip key={n} active={days.includes(n)} onClick={() => setDays(days.includes(n) ? days.filter((x) => x !== n) : [...days, n])}>{fmt.weekdayName(n)}</Chip>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="label-base">{t("Boshlanishi (soat)")}</span><input className="input-base" inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="block"><span className="label-base">{t("Tugashi (soat)")}</span><input className="input-base" inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button variant="gradient" className="w-full" onClick={save}>{t("Saqlash")}</Button>
      </div>
    </Modal>
  );
}

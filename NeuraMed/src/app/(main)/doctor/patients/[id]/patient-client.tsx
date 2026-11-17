"use client";

import * as React from "react";
import { User, HeartPulse, Activity, FlaskConical, MessageCircle, Pill, AlertTriangle, ClipboardList, Droplet, Send, Scan, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, EmergencyBanner, useFormat } from "@/components/modules/common";
import { CheckupPanel } from "@/components/care/checkup-panel";
import { VitalsPanel } from "@/components/care/vitals-panel";

type Tab = "overview" | "checkup" | "vitals" | "reports" | "chat";
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Umumiy", icon: User },
  { id: "checkup", label: "Chekap", icon: HeartPulse },
  { id: "vitals", label: "Koʻrsatkichlar", icon: Activity },
  { id: "reports", label: "Tahlillar", icon: FlaskConical },
  { id: "chat", label: "Xabarlar", icon: MessageCircle },
];

interface Marker { name: string; value: string | number; unit: string; status: string; range: string }
interface Summary {
  profile: { name: string | null; age: number | null; gender: string | null; heightCm: number | null; weightKg: number | null; allergies: string[]; chronicConditions: string[]; pregnancyStatus: string | null };
  bloodType: string | null;
  medications: string[];
  appointments: { id: string; date: string; time: string; reason: string | null }[];
  labs: { id: string; fileName: string | null; createdAt: string; urgent: boolean; summary: string | null; markers: Marker[] }[];
  imaging: { id: string; fileName: string | null; type: string | null; createdAt: string; summary: string | null }[];
  preps: { id: string; createdAt: string; symptoms: string[]; duration: string | null; urgency: string; appointmentId: string | null; questions: string[] }[];
}

const GENDER: Record<string, string> = { MALE: "Erkak", FEMALE: "Ayol" };
const STATUS_CLS: Record<string, string> = { low: "text-sky-700 dark:text-sky-300", high: "text-red-600 dark:text-red-400", normal: "text-emerald-700 dark:text-emerald-300" };

/** Shifokor uchun bemor sahifasi: umumiy ma'lumot, chekap o'tkazish, ko'rsatkich kiritish, tahlillar, chat. */
export function PatientClient({ id, initialTab }: { id: string; initialTab?: string }) {
  const t = useT();
  const fmt = useFormat();
  const [tab, setTab] = React.useState<Tab>(TABS.find((x) => x.id === initialTab)?.id || "overview");
  const [s, setS] = React.useState<Summary | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => { api<Summary>(`/api/doctor/patients/${id}`).then(setS).catch((e) => setError(t(e.message))); }, [id, t]);

  if (error) return <div className="px-4 py-4"><p role="alert" className="card-base p-4 text-sm text-red-600 dark:text-red-400">{error}</p></div>;
  if (!s) return <div className="px-4 py-4"><LoadingCard /></div>;
  const p = s.profile;
  const urgentPrep = s.preps.some((x) => x.urgency === "EMERGENCY");
  const todayIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const nextAppt = s.appointments.find((a) => a.date >= todayIso) || s.appointments[s.appointments.length - 1];

  return (
    <div className="px-4 py-4 space-y-4">
      <section className="card-base p-4 flex flex-wrap items-center gap-4">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-lg font-bold text-white">{(p.name || "B").split(/\s+/).map((x) => x[0]).slice(0, 2).join("")}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t(p.name || "Bemor")}</h2>
          <p className="text-sm text-slate-500">{[p.age ? `${p.age} ${t("yosh")}` : null, p.gender ? t(GENDER[p.gender] || p.gender) : null, s.bloodType ? `${t("Qon guruhi")}: ${s.bloodType}` : null].filter(Boolean).join(" · ")}</p>
        </div>
        {nextAppt && <p className="flex items-center gap-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/20 px-3 py-2 text-sm font-semibold text-teal-800 dark:text-teal-200"><CalendarCheck className="h-4 w-4" />{fmt.day(nextAppt.date)} · {nextAppt.time}</p>}
      </section>

      {p.allergies.length > 0 && (
        <p className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 dark:border-red-900 dark:bg-red-900/20 p-3 text-sm font-semibold text-red-800 dark:text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />{t("Allergiya:")} {p.allergies.map((a) => t(a)).join(", ")}
        </p>
      )}

      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-soft">
        {TABS.map((it) => (
          <button key={it.id} role="tab" aria-selected={tab === it.id} type="button" onClick={() => setTab(it.id)}
            className={cn("flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition", tab === it.id ? "bg-gradient-primary text-white shadow" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>
            <it.icon className="h-4 w-4" />{t(it.label)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-3 md:grid-cols-2">
          <Card title="Surunkali kasalliklar" icon={Droplet}>
            {p.chronicConditions.length ? <ul className="list-disc pl-5">{p.chronicConditions.map((c) => <li key={c}>{t(c)}</li>)}</ul> : <Empty />}
          </Card>
          <Card title="Qabul qilayotgan dorilar" icon={Pill}>
            {s.medications.length ? <ul className="list-disc pl-5">{s.medications.map((m) => <li key={m}>{t(m)}</li>)}</ul> : <Empty />}
          </Card>
          <Card title="Qabulga tayyorlanish (bemor yozgan)" icon={ClipboardList} wide>
            {urgentPrep && <EmergencyBanner className="mb-2" />}
            {s.preps.length === 0 ? <Empty text="Bemor hali qabulga tayyorlanmagan." /> : s.preps.map((x) => (
              <div key={x.id} className="mb-3 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 last:mb-0">
                <p className="text-xs text-slate-400">{fmt.day(x.createdAt)}{x.duration ? ` · ${t("davomiyligi:")} ${x.duration}` : ""}</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{x.symptoms.join(", ")}</p>
                {x.questions.length > 0 && <><p className="mt-1 text-xs font-semibold text-slate-500">{t("Bemorning savollari:")}</p><ul className="list-disc pl-5 text-sm">{x.questions.slice(0, 5).map((q) => <li key={q}>{t(q)}</li>)}</ul></>}
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab === "checkup" && <CheckupPanel patientId={id} />}
      {tab === "vitals" && <VitalsPanel patientId={id} />}

      {tab === "reports" && (
        <div className="space-y-3">
          {s.labs.length === 0 && s.imaging.length === 0 && <p className="card-base p-6 text-center text-sm text-slate-500">{t("Bemor hali tahlil yuklamagan.")}</p>}
          {s.labs.map((r) => (
            <Card key={r.id} title={r.fileName || "Tahlil"} icon={FlaskConical} wide>
              <p className="text-xs text-slate-400">{fmt.day(r.createdAt)}{r.urgent ? ` · ${t("Shoshilinch qiymatlar bor")}` : ""}</p>
              {r.summary && <p className="mt-1">{t(r.summary)}</p>}
              {r.markers.length > 0 && (
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {r.markers.map((m) => (
                      <tr key={m.name} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1.5 pr-2">{t(m.name)}</td>
                        <td className={cn("py-1.5 pr-2 font-semibold", STATUS_CLS[m.status] || "")}>{m.value} {m.unit}</td>
                        <td className="py-1.5 text-xs text-slate-400">{m.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          ))}
          {s.imaging.map((r) => (
            <Card key={r.id} title={r.fileName || "Rentgen hisoboti"} icon={Scan} wide>
              <p className="text-xs text-slate-400">{fmt.day(r.createdAt)}{r.type ? ` · ${t(r.type)}` : ""}</p>
              {r.summary && <p className="mt-1">{t(r.summary)}</p>}
            </Card>
          ))}
        </div>
      )}

      {tab === "chat" && <DoctorChat patientId={id} />}
    </div>
  );
}

function Card({ title, icon: Icon, children, wide }: { title: string; icon: React.ElementType; children: React.ReactNode; wide?: boolean }) {
  const t = useT();
  return (
    <section className={cn("card-base p-4 text-sm text-slate-600 dark:text-slate-300", wide && "md:col-span-2")}>
      <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Icon className="h-4 w-4 text-teal-600 dark:text-teal-400" />{t(title)}</h3>
      {children}
    </section>
  );
}

function Empty({ text = "Maʼlumot yoʻq" }: { text?: string }) {
  const t = useT();
  return <p className="text-slate-400">{t(text)}</p>;
}

interface Msg { id: string; sender: "me" | "doctor"; text: string; createdAt: string }

function DoctorChat({ patientId }: { patientId: string }) {
  const t = useT();
  const fmt = useFormat();
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const load = React.useCallback(() => api<{ data: Msg[] }>(`/api/doctor/messages?patientId=${patientId}`).then((r) => setMsgs(r.data)).catch((e) => setError(t(e.message))), [patientId, t]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);
  const send = async () => {
    const v = text.trim(); if (!v) return;
    setText(""); setError(null);
    try { const r = await api<{ data: Msg }>("/api/doctor/messages", { method: "POST", json: { patientId, text: v } }); setMsgs((m) => [...m, r.data]); }
    catch (e: any) { setError(t(e.message)); }
  };
  return (
    <section className="card-base flex min-h-[380px] flex-col p-4">
      <div className="flex-1 space-y-2 overflow-y-auto py-2 max-h-[50vh]">
        {msgs.length === 0 && <p className="text-center text-xs text-slate-400">{t("Xabarlar yoʻq.")}</p>}
        {msgs.map((m) => (
          <div key={m.id} className={cn("flex", m.sender === "doctor" ? "justify-end" : "justify-start")}>
            <p className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap", m.sender === "doctor" ? "rounded-br-md bg-gradient-primary text-white" : "rounded-bl-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200")}>
              {t(m.text)}<span className="mt-0.5 block text-[10px] opacity-60">{fmt.dayNoYear(m.createdAt)}</span>
            </p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={t("Bemorga javob yozing…")} aria-label={t("Xabar")} className="input-base flex-1" />
        <Button type="submit" variant="gradient" size="icon" disabled={!text.trim()} aria-label={t("Yuborish")}><Send className="h-4 w-4" /></Button>
      </form>
    </section>
  );
}

"use client";

import { useT } from "@/i18n/client";
import * as React from "react";
import { CalendarDays, Stethoscope, Building2, MessageCircle, Star, Clock, Languages, MapPin, Send, CalendarCheck, XCircle, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LoadingCard, LoadingSpinner } from "@/components/ui/loading";
import { api, Chip, DemoBadge, DemoNote, EmergencyBanner, Modal, ModuleHero, Toast, useFormat } from "@/components/modules/common";
import type { Doctor, Clinic } from "@/lib/modules/connect";

type Doc = Doctor & { clinic?: Clinic; nextFree: { date: string; time: string } | null };
interface Appt { id: string; doctorId: string; date: string; time: string; name: string; phone?: string | null; reason?: string | null; status: string; createdAt: string }
interface Msg { id: string; sender: "me" | "doctor"; text: string; createdAt: string }
type Tab = "doctors" | "clinics" | "appointments" | "messages";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "doctors", label: "Shifokorlar", icon: Stethoscope },
  { id: "clinics", label: "Muassasalar", icon: Building2 },
  { id: "appointments", label: "Qabullarim", icon: CalendarCheck },
  { id: "messages", label: "Xabarlar", icon: MessageCircle },
];

const initials = (n: string) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join("");

function Avatar({ d, size = 48 }: { d: Doctor; size?: number }) {
  return <span className="inline-flex shrink-0 items-center justify-center rounded-2xl font-bold text-white" style={{ width: size, height: size, background: d.color, fontSize: size / 2.8 }}>{initials(d.name)}</span>;
}

export function ConnectClient({ initialTab, userName }: { initialTab?: string; userName: string }) {
  const t = useT();
  const fmt = useFormat();
  const { day: formatDay, weekday } = fmt;
  const [tab, setTab] = React.useState<Tab>((TABS.find((it) => it.id === initialTab)?.id) || "doctors");
  const [doctors, setDoctors] = React.useState<Doc[] | null>(null);
  const [clinics, setClinics] = React.useState<Clinic[]>([]);
  const [appts, setAppts] = React.useState<Appt[]>([]);
  const [unread, setUnread] = React.useState<Record<string, number>>({});
  const [spec, setSpec] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [profile, setProfile] = React.useState<Doc | null>(null);
  const [booking, setBooking] = React.useState<Doc | null>(null);
  const [chatDoc, setChatDoc] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const [c, a, u] = await Promise.all([
      api<{ doctors: Doc[]; clinics: Clinic[] }>("/api/connect"),
      api<{ data: Appt[] }>("/api/connect/appointments"),
      api<{ unread: Record<string, number> }>("/api/connect/messages"),
    ]);
    setDoctors(c.doctors); setClinics(c.clinics); setAppts(a.data); setUnread(u.unread);
  }, []);
  React.useEffect(() => { load().catch(() => {}); }, [load]);

  const specs = Array.from(new Set((doctors || []).map((d) => d.specialty)));
  const list = (doctors || []).filter((d) => (!spec || d.specialty === spec) && (!q || `${t(d.name)} ${t(d.specialty)} ${t(d.clinic?.name ?? "")}`.toLowerCase().includes(q.toLowerCase())));
  const docById = (id: string) => doctors?.find((d) => d.id === id);
  const upcoming = appts.filter((a) => a.status === "pending");

  const cancel = async (id: string) => {
    if (!confirm(t("Qabul bekor qilinsinmi?"))) return;
    await api(`/api/connect/appointments/${id}`, { method: "PATCH" }).catch(() => {});
    setToast(t("Qabul bekor qilindi")); load();
  };

  const openChat = (id: string) => { setProfile(null); setChatDoc(id); setTab("messages"); };

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={CalendarDays} name="MEDCONNECT" title={t("Shifokor topish, qabulga yozilish, maslahat")} text="Mutaxassis boʻyicha shifokorni tanlang, boʻsh vaqtni koʻring va bir necha bosishda qabulga yoziling." />
      <DemoNote>{t("Namunaviy shifokorlar va muassasalar — haqiqiy shaxslar emas. Qabul real tizimda belgilanmaydi, chatdagi javoblar avtomatik.")}</DemoNote>

      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-soft">
        {TABS.map((it) => {
          const badge = it.id === "appointments" ? upcoming.length : it.id === "messages" ? Object.values(unread).reduce((s, n) => s + n, 0) : 0;
          return (
            <button key={it.id} role="tab" aria-selected={tab === it.id} type="button" onClick={() => setTab(it.id)}
              className={cn("flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition", tab === it.id ? "bg-gradient-primary text-white shadow" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>
              <it.icon className="h-4 w-4" />{t(it.label)}
              {badge > 0 && <span className={cn("rounded-full px-1.5 text-[10px]", tab === it.id ? "bg-white/25" : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400")}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {!doctors ? <LoadingCard /> : (
        <>
          {tab === "doctors" && (
            <section className="space-y-3">
              <SymptomRouter onBook={(id) => { const d = doctors.find((x) => x.id === id); if (d) setBooking(d); }} />
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Shifokor, mutaxassislik yoki muassasa")} aria-label={t("Shifokor qidirish")} className="input-base pl-10" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Chip active={!spec} onClick={() => setSpec(null)}>{t("Barchasi")}</Chip>
                {specs.map((s) => <Chip key={s} active={spec === s} onClick={() => setSpec(s)}>{t(s)}</Chip>)}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {list.map((d) => (
                  <article key={d.id} className="card-base p-4 flex flex-col gap-3">
                    <div className="flex gap-3">
                      <Avatar d={d} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 dark:text-white">{t(d.name)}</p>
                        <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">{t(d.specialty)}</p>
                        <p className="truncate text-xs text-slate-500">{t(d.clinic?.name ?? "")}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 self-start text-sm font-bold text-amber-500"><Star className="h-4 w-4 fill-amber-400" />{d.rating}</span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />
                      {d.nextFree ? <>{t("Eng yaqin boʻsh vaqt:")} <b className="text-slate-700 dark:text-slate-200">{weekday(d.nextFree.date)}, {formatDay(d.nextFree.date)} · {d.nextFree.time}</b></> : t("Yaqin kunlarda boʻsh vaqt yoʻq")}
                    </p>
                    <div className="mt-auto flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setProfile(d)}>{t("Profil")}</Button>
                      <Button variant="gradient" size="sm" className="flex-1" onClick={() => setBooking(d)} disabled={!d.nextFree}>{t("Qabulga yozilish")}</Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {tab === "clinics" && (
            <section className="grid gap-3 md:grid-cols-2">
              {clinics.map((c) => (
                <article key={c.id} className="card-base p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">{t(c.type)}</p>
                  <p className="font-bold text-slate-900 dark:text-white">{t(c.name)}</p>
                  <p className="mt-1 text-xs text-slate-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t(c.city)}, {t(c.address)}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t(c.hours)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{c.departments.map((d) => <span key={d} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-300">{t(d)}</span>)}</div>
                  <p className="mt-3 text-xs text-slate-400">{t("Shifokorlar:")} {doctors.filter((d) => d.clinicId === c.id).map((d) => d.name).join(", ") || "—"}</p>
                </article>
              ))}
            </section>
          )}

          {tab === "appointments" && (
            <section className="space-y-3">
              {appts.length === 0 && <p className="card-base p-6 text-center text-sm text-slate-500">{t("Hali qabulga yozilmagansiz. “Shifokorlar” boʻlimidan vaqt tanlang.")}</p>}
              {appts.map((a) => {
                const d = docById(a.doctorId);
                const active = a.status === "pending";
                return (
                  <article key={a.id} className={cn("card-base p-4 flex flex-wrap items-center gap-3", !active && "opacity-60")}>
                    {d && <Avatar d={d} size={44} />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">{t(d?.name ?? "")} · <span className="text-teal-700 dark:text-teal-400">{t(d?.specialty ?? "")}</span></p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{weekday(a.date)}, {formatDay(a.date)} · {a.time}</p>
                      <p className="text-xs text-slate-400">{t(d?.clinic?.name ?? "")}{a.reason ? ` · ${a.reason}` : ""}</p>
                    </div>
                    {active ? (
                      <><DemoBadge>{t("Kutilmoqda · demo")}</DemoBadge><Button variant="ghost" size="sm" onClick={() => cancel(a.id)}><XCircle className="h-4 w-4" /> {t("Bekor qilish")}</Button></>
                    ) : <span className="text-xs font-semibold text-slate-400">{t("Bekor qilingan")}</span>}
                  </article>
                );
              })}
            </section>
          )}

          {tab === "messages" && <Messages doctors={doctors} unread={unread} active={chatDoc} onPick={(id) => { setChatDoc(id); setUnread((u) => ({ ...u, [id]: 0 })); }} />}
        </>
      )}

      <Modal open={!!profile} onClose={() => setProfile(null)} title={t("Shifokor profili")}>
        {profile && (
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-center"><Avatar d={profile} size={56} /><div><p className="text-lg font-bold text-slate-900 dark:text-white">{t(profile.name)}</p><p className="text-teal-700 dark:text-teal-400">{t(profile.specialty)} · {profile.experience} {t("yil tajriba")}</p></div></div>
            <p className="text-slate-600 dark:text-slate-300">{t(profile.about)}</p>
            <p className="flex items-center gap-1.5 text-slate-500"><Languages className="h-4 w-4" />{profile.languages.map((l) => t(l)).join(", ")}</p>
            <p className="flex items-center gap-1.5 text-slate-500"><Building2 className="h-4 w-4" />{t(profile.clinic?.name ?? "")}, {t(profile.clinic?.city ?? "")}</p>
            <p className="flex items-center gap-1.5 text-slate-500"><Clock className="h-4 w-4" />{t("Qabul:")} {profile.workDays.map((d) => fmt.weekdayName(d)).join(", ")} · {profile.hours[0]}:00–{profile.hours[1]}:00</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">{t("Namunaviy profil — haqiqiy shifokor emas.")}</p>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => openChat(profile.id)}><MessageCircle className="h-4 w-4" /> {t("Xabar yozish")}</Button>
              <Button variant="gradient" className="flex-1" onClick={() => { setBooking(profile); setProfile(null); }}>{t("Qabulga yozilish")}</Button>
            </div>
          </div>
        )}
      </Modal>

      {booking && <BookingModal doc={booking} userName={userName} onClose={() => setBooking(null)} onDone={() => { setBooking(null); setToast(t("Qabulga yozildingiz (demo)")); setTab("appointments"); load(); }} />}
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function BookingModal({ doc, userName, onClose, onDone }: { doc: Doc; userName: string; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const { day: formatDay, weekday } = useFormat();
  const [days, setDays] = React.useState<{ date: string; slots: { time: string; free: boolean }[] }[] | null>(null);
  const [date, setDate] = React.useState<string | null>(null);
  const [time, setTime] = React.useState<string | null>(null);
  const [name, setName] = React.useState(userName);
  const [phone, setPhone] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    api<{ data: typeof days }>(`/api/connect/slots?doctorId=${doc.id}`).then((r) => { setDays(r.data); setDate(r.data?.[0]?.date || null); }).catch((e) => setError(t(e.message)));
  }, [doc.id]);

  const submit = async () => {
    setBusy(true); setError(null);
    try { await api("/api/connect/appointments", { method: "POST", json: { doctorId: doc.id, date, time, name, phone, reason } }); onDone(); }
    catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };
  const day = days?.find((d) => d.date === date);

  return (
    <Modal open onClose={onClose} title={`${t("Qabulga yozilish")} — ${t(doc.name)}`} wide>
      {!days ? <LoadingSpinner /> : (
        <div className="space-y-4">
          <div>
            <p className="label-base">{t("Sana")}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((d) => (
                <button key={d.date} type="button" onClick={() => { setDate(d.date); setTime(null); }}
                  className={cn("shrink-0 rounded-2xl border px-3 py-2 text-center", date === d.date ? "border-transparent bg-gradient-primary text-white" : "border-slate-200 dark:border-slate-700")}>
                  <span className="block text-[11px] opacity-80">{weekday(d.date)}</span>
                  <span className="block text-sm font-bold">{Number(d.date.slice(8, 10))}</span>
                </button>
              ))}
            </div>
          </div>
          {day && (
            <div>
              <p className="label-base">{t("Vaqt")}</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {day.slots.map((s) => (
                  <button key={s.time} type="button" disabled={!s.free} onClick={() => setTime(s.time)}
                    className={cn("rounded-xl border py-2 text-sm font-semibold", !s.free ? "border-slate-100 bg-slate-50 text-slate-300 line-through dark:bg-slate-800 dark:border-slate-800" : time === s.time ? "border-transparent bg-gradient-primary text-white" : "border-slate-200 hover:border-teal-400 dark:border-slate-700")}>
                    {s.time}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="label-base">{t("Ismingiz")}</span><input className="input-base" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></label>
            <label className="block"><span className="label-base">{t("Telefon (ixtiyoriy)")}</span><input className="input-base" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" inputMode="tel" /></label>
          </div>
          <label className="block"><span className="label-base">{t("Murojaat sababi (ixtiyoriy)")}</span><input className="input-base" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={t("Masalan: tahlil natijalarini muhokama qilish")} /></label>
          {error && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
          <Button variant="gradient" className="w-full" disabled={!date || !time || busy} onClick={submit}>
            {time ? `${formatDay(date)} · ${time} — ${t("tasdiqlash")}` : t("Vaqtni tanlang")}
          </Button>
          <p className="text-center text-[11px] text-slate-400">{t("Demo: qabul real tizimda belgilanmaydi va shifokorga xabar yuborilmaydi.")}</p>
        </div>
      )}
    </Modal>
  );
}

interface RouteResult { specialty: string; matched: string[]; alternatives: string[]; fallback: boolean; emergency: boolean; doctors: { id: string; name: string; specialty: string; nextFree: { date: string; time: string } | null }[] }

/** Belgilar bo'yicha qaysi mutaxassisdan boshlashni taklif qiladi (tashxis emas). */
function SymptomRouter({ onBook }: { onBook: (doctorId: string) => void }) {
  const t = useT();
  const { day, weekday } = useFormat();
  const [text, setText] = React.useState("");
  const [r, setR] = React.useState<RouteResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const go = async (value?: string) => {
    const v = (value ?? text).trim();
    if (value) setText(value);
    setBusy(true); setError(null);
    try { setR(await api<RouteResult>("/api/connect/route-symptoms", { method: "POST", json: { text: v } })); }
    catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };
  return (
    <div className="card-base p-4 space-y-3">
      <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />{t("Qaysi shifokorga borishni bilmayapsizmi?")}</h3>
      <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex gap-2">
        <input className="input-base flex-1" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={t("Belgilaringizni yozing: masalan, bosim tez-tez koʻtariladi")} aria-label={t("Belgilaringiz")} />
        <Button type="submit" variant="gradient" disabled={busy || text.trim().length < 3}>{t("Tavsiya")}</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {["Bosim koʻtariladi, yurak tez uradi", "Bosh ogʻrigʻi va uyqusizlik", "Bolam tez-tez shamollaydi"].map((x) => <Chip key={x} onClick={() => go(t(x))}>{t(x)}</Chip>)}
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {r && (
        <div className="space-y-2">
          {r.emergency && <EmergencyBanner />}
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {r.fallback ? t("Aniq belgi topilmadi — avval terapevtdan boshlash tavsiya etiladi.") : t("Tavsiya: avval {s} bilan maslahatlashing.", { s: t(r.specialty) })}
            {r.alternatives.length > 0 && <span className="text-slate-500"> {t("Muqobil:")} {r.alternatives.map((a) => t(a)).join(", ")}</span>}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {r.doctors.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{t(d.name)}</p>
                  <p className="text-xs text-slate-500">{d.nextFree ? `${weekday(d.nextFree.date)}, ${day(d.nextFree.date)} · ${d.nextFree.time}` : t("Yaqin kunlarda boʻsh vaqt yoʻq")}</p></div>
                <Button size="sm" variant="gradient" disabled={!d.nextFree} onClick={() => onBook(d.id)}>{t("Qabulga yozilish")}</Button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-slate-400">{t("Bu tashxis emas — faqat qaysi mutaxassisdan boshlash qulayligi boʻyicha yoʻnaltirish.")}</p>
        </div>
      )}
    </div>
  );
}

function Messages({ doctors, unread, active, onPick }: { doctors: Doc[]; unread: Record<string, number>; active: string | null; onPick: (id: string) => void }) {
  const t = useT();
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [emergency, setEmergency] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  const doc = doctors.find((d) => d.id === active);

  React.useEffect(() => {
    setEmergency(false); setError(null);
    if (!active) return;
    api<{ data: Msg[] }>(`/api/connect/messages?doctorId=${active}`).then((r) => setMsgs(r.data)).catch(() => setMsgs([]));
  }, [active]);
  React.useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || !active || busy) return;
    setBusy(true); setError(null);
    setMsgs((m) => [...m, { id: `tmp${Date.now()}`, sender: "me", text: msg, createdAt: new Date().toISOString() }]);
    setText("");
    try {
      const r = await api<{ reply: Msg; flags: { emergency: boolean } }>("/api/connect/messages", { method: "POST", json: { doctorId: active, text: msg } });
      setEmergency(r.flags.emergency);
      setTimeout(() => setMsgs((m) => [...m, r.reply]), 600);
    } catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };

  return (
    <section className="grid gap-3 md:grid-cols-[240px_1fr]">
      <ul className="card-base p-2 space-y-1 h-fit">
        {doctors.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => onPick(d.id)} className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-left", active === d.id ? "bg-teal-50 dark:bg-teal-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800")}>
              <Avatar d={d} size={36} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{t(d.name)}</span><span className="block truncate text-[11px] text-slate-400">{t(d.specialty)}</span></span>
              {!!unread[d.id] && <span className="rounded-full bg-teal-500 px-1.5 text-[10px] font-bold text-white">{unread[d.id]}</span>}
            </button>
          </li>
        ))}
      </ul>
      <div className="card-base flex min-h-[420px] flex-col p-4">
        {!doc ? (
          <p className="m-auto text-center text-sm text-slate-500">{t("Suhbatni boshlash uchun shifokorni tanlang.")}</p>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Avatar d={doc} size={36} />
              <div className="flex-1"><p className="font-semibold text-slate-900 dark:text-white">{t(doc.name)}</p><p className="text-[11px] text-slate-400">{t(doc.specialty)}</p></div>
              <DemoBadge>{t("Avtomatik javob")}</DemoBadge>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto py-3 max-h-[50vh]">
              {msgs.length === 0 && <p className="text-center text-xs text-slate-400">{t("Xabarlar yoʻq. Savolingizni yozing.")}</p>}
              {msgs.map((m) => (
                <div key={m.id} className={cn("flex", m.sender === "me" ? "justify-end" : "justify-start")}>
                  <p className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap", m.sender === "me" ? "rounded-br-md bg-gradient-primary text-white" : "rounded-bl-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200")}>{t(m.text)}</p>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {emergency && <EmergencyBanner className="mb-2" />}
            {error && <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={t("Xabar yozing…")} aria-label={t("Xabar")} className="input-base flex-1" />
              <Button type="submit" variant="gradient" size="icon" disabled={!text.trim() || busy} aria-label={t("Yuborish")}><Send className="h-4 w-4" /></Button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}

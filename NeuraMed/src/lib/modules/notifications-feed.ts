/**
 * 🔔 Umumiy bildirishnomalar: dori vaqti, qabullar, shifokor chekapi va ko'rsatkichlari, xabarlar, PHARMA TRACE.
 * Ma'lumotlardan hisoblanadi (alohida jadval kerak emas). "O'qildi" — User.notifReadAt.
 */
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";
import { isoDay } from "@/lib/modules/dates";
import { traceSummary } from "@/lib/modules/trace";
import { getDoctors, patientsOf } from "@/lib/modules/doctors";
import type { AuthUser } from "@/types";

export type NotifKind = "dose" | "appointment" | "checkup" | "vitals" | "message" | "trace" | "prep";
export interface Notif { id: string; kind: NotifKind; text: string; vars?: Record<string, string | number>; href: string; at: string; unread: boolean }

const atTime = (day: Date, hhmm: string) => { const d = new Date(day); const [h, m] = hhmm.split(":").map(Number); d.setHours(h || 0, m || 0, 0, 0); return d; };

export async function buildFeed(user: AuthUser): Promise<Notif[]> {
  const me: any = await prisma.user.findUnique({ where: { id: user.id } });
  const readAt = me?.notifReadAt ? new Date(me.notifReadAt).getTime() : 0;
  const now = new Date();
  const today = isoDay(now);
  const tomorrow = isoDay(new Date(now.getTime() + 86400000));
  const items: Omit<Notif, "unread">[] = [];

  if (user.role === "doctor") {
    const ref = user.doctorRef || user.id;
    const names = new Map((await patientsOf(ref)).map((p) => [p.id, p.name]));
    const appts: any[] = await prisma.appointment.findMany({ where: { doctorId: ref } });
    for (const a of appts.filter((x) => x.status !== "cancelled" && (x.date === today || x.date === tomorrow))) {
      items.push({ id: `a-${a.id}`, kind: "appointment", text: a.date === today ? "Bugun {time} — {name} qabulga yozilgan" : "Ertaga {time} — {name} qabulga yozilgan", vars: { time: a.time, name: names.get(a.userId) || a.name }, href: `/doctor/patients/${a.userId}`, at: new Date(a.createdAt).toISOString() });
    }
    const msgs: any[] = await prisma.doctorMessage.findMany({ where: { doctorId: ref, sender: "me", read: false } });
    const byPatient = new Map<string, any>();
    for (const m of msgs) if (!byPatient.has(m.userId) || String(m.createdAt) > String(byPatient.get(m.userId).createdAt)) byPatient.set(m.userId, m);
    for (const [pid, m] of Array.from(byPatient)) items.push({ id: `m-${m.id}`, kind: "message", text: "{name} sizga xabar yozdi", vars: { name: names.get(pid) || "Bemor" }, href: `/doctor/patients/${pid}?tab=chat`, at: new Date(m.createdAt).toISOString() });
    const apptIds = new Set(appts.map((a) => a.id));
    const preps: any[] = (await Promise.all(Array.from(names.keys()).map((pid) => prisma.doctorVisitPrep.findMany({ where: { userId: pid } })))).flat();
    for (const p of preps.filter((x) => x.appointmentId && apptIds.has(x.appointmentId))) {
      items.push({ id: `p-${p.id}`, kind: "prep", text: "{name} qabulga tayyorlandi: belgilar va savollar", vars: { name: names.get(p.userId) || "Bemor" }, href: `/doctor/patients/${p.userId}`, at: new Date(p.createdAt).toISOString() });
    }
  } else {
    // Dori vaqti (bugungi dozalar)
    const reminders: any[] = await prisma.reminder.findMany({ where: { userId: user.id, status: "ACTIVE" } });
    for (const r of reminders) {
      const sched = parseJsonSafe<any[]>(r.scheduleJson, []);
      for (const s of sched) {
        const time = typeof s === "string" ? s : s?.time;
        if (!/^\d{1,2}:\d{2}$/.test(String(time))) continue;
        const at = atTime(now, time);
        if (at.getTime() > now.getTime() + 3 * 3600000) continue; // faqat o'tgan va 3 soat ichidagi dozalar
        items.push({ id: `d-${r.id}-${time}`, kind: "dose", text: at <= now ? "Dori vaqti: {name} {dose} — {time}" : "Tez orada: {name} {dose} — {time}", vars: { name: r.medicationName, dose: r.dose || "", time }, href: `/reminders/${r.id}`, at: at.toISOString() });
      }
    }
    // Qabullar (bugun/ertaga)
    const doctors = await getDoctors();
    const docName = (id: string) => doctors.find((d) => d.id === id);
    const appts: any[] = await prisma.appointment.findMany({ where: { userId: user.id, status: "pending" } });
    for (const a of appts.filter((x) => x.date === today || x.date === tomorrow)) {
      const d = docName(a.doctorId);
      items.push({ id: `a-${a.id}`, kind: "appointment", text: a.date === today ? "Bugun {time} — {doctor} ({specialty}) qabuli" : "Ertaga {time} — {doctor} ({specialty}) qabuli", vars: { time: a.time, doctor: d?.name || "", specialty: d?.specialty || "" }, href: "/connect?tab=appointments", at: new Date(a.createdAt).toISOString() });
    }
    // Shifokor chekapi
    const checkups: any[] = await prisma.checkup.findMany({ where: { userId: user.id } });
    for (const c of checkups.filter((x) => x.doctorRef).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 2)) {
      items.push({ id: `c-${c.id}`, kind: "checkup", text: "{doctor} chekap oʻtkazdi: {score}/100", vars: { doctor: c.doctorName || "", score: c.score }, href: "/checkup", at: new Date(c.createdAt).toISOString() });
    }
    // Shifokor kiritgan ko'rsatkichlar (eng so'nggi kun)
    const vitals: any[] = (await prisma.vitalReading.findMany({ where: { userId: user.id } })).filter((v: any) => v.doctorRef && v.type !== "bp");
    if (vitals.length) {
      const latest = vitals.reduce((a, b) => (String(a.createdAt) > String(b.createdAt) ? a : b));
      const day = String(new Date(latest.createdAt).toISOString()).slice(0, 10);
      const n = new Set(vitals.filter((v) => new Date(v.createdAt).toISOString().slice(0, 10) === day).map((v) => v.type)).size;
      items.push({ id: `v-${latest.id}`, kind: "vitals", text: "{doctor} {n} ta koʻrsatkich kiritdi", vars: { doctor: latest.doctorName || "", n }, href: "/checkup?tab=vitals", at: new Date(latest.createdAt).toISOString() });
    }
    // Shifokordan yangi xabar
    const msgs: any[] = await prisma.doctorMessage.findMany({ where: { userId: user.id, sender: "doctor", read: false } });
    const byDoc = new Map<string, any>();
    for (const m of msgs) if (!byDoc.has(m.doctorId) || String(m.createdAt) > String(byDoc.get(m.doctorId).createdAt)) byDoc.set(m.doctorId, m);
    for (const [did, m] of Array.from(byDoc)) items.push({ id: `m-${m.id}`, kind: "message", text: "{doctor} sizga javob yozdi", vars: { doctor: docName(did)?.name || "" }, href: "/connect?tab=messages", at: new Date(m.createdAt).toISOString() });
    // PHARMA TRACE ogohlantirishi
    const tr = traceSummary();
    if (tr.suspicious.length) {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      items.push({ id: `t-${tr.suspicious[0].id}-${today}`, kind: "trace", text: "PHARMA TRACE: {name} partiyasi shubhali", vars: { name: tr.suspicious[0].name }, href: `/trace/${tr.suspicious[0].id}`, at: start.toISOString() });
    }
  }

  const nowMs = now.getTime();
  return items
    .map((x) => ({ ...x, unread: new Date(x.at).getTime() <= nowMs && new Date(x.at).getTime() > readAt }))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 30);
}

export async function markAllRead(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { notifReadAt: new Date() } });
}

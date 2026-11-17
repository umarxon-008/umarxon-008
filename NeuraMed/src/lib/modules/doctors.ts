/**
 * Shifokorlar katalogi (MEDCONNECT) va shifokor–bemor bog'lanishi.
 * Katalog = namunaviy shifokorlar + ro'yxatdan o'tgan shifokor hisoblari.
 * Shifokor faqat o'ziga yozilgan (va ruxsatni bekor qilmagan) bemorni ko'radi.
 */
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/modules/http";
import { doctors as STATIC_DOCTORS, clinicById, type Doctor } from "./connect";

const COLORS = ["#0e9aa0", "#6d28d9", "#10b981", "#0b5d73", "#7c3aed", "#0891b2"];
const parse = <T,>(s: string | null | undefined, d: T): T => { try { return s ? (JSON.parse(s) as T) : d; } catch { return d; } };

export type CatalogDoctor = Doctor & { hasAccount: boolean; verified: boolean; clinicName?: string };

function fromAccount(u: any, base?: Doctor): CatalogDoctor {
  const workDays = parse<number[]>(u.workDaysJson, base?.workDays ?? [1, 2, 3, 4, 5]);
  const hours = parse<[number, number]>(u.workHoursJson, base?.hours ?? [9, 17]);
  if (base) return { ...base, workDays, hours, hasAccount: true, verified: false };
  return {
    id: u.id,
    name: u.name || "Shifokor",
    specialty: u.specialty || "Shifokor",
    clinicId: "",
    clinicName: u.clinicName || "",
    experience: 0,
    languages: [],
    rating: 0,
    workDays,
    hours,
    color: COLORS[(u.id.charCodeAt(u.id.length - 1) || 0) % COLORS.length],
    about: "",
    hasAccount: true,
    verified: false,
  };
}

export async function doctorAccounts(): Promise<any[]> {
  return prisma.user.findMany({ where: { role: "doctor" } });
}

/** MEDCONNECT katalogi: namunaviy shifokorlar (hisobga bog'langanlari ham) + ro'yxatdan o'tgan shifokorlar. */
export async function getDoctors(): Promise<CatalogDoctor[]> {
  const accounts = await doctorAccounts();
  const linked = new Map(accounts.filter((u) => u.doctorRef && u.doctorRef !== u.id).map((u) => [u.doctorRef as string, u]));
  const list: CatalogDoctor[] = STATIC_DOCTORS.map((d) => (linked.has(d.id) ? fromAccount(linked.get(d.id), d) : { ...d, hasAccount: false, verified: false }));
  for (const u of accounts) if (!u.doctorRef || u.doctorRef === u.id) list.push(fromAccount(u));
  return list;
}

export async function findDoctor(id: string): Promise<CatalogDoctor | null> {
  return (await getDoctors()).find((d) => d.id === id) || null;
}

export const clinicNameOf = (d: CatalogDoctor) => d.clinicName || clinicById(d.clinicId)?.name || "";

/** Katalogdagi shifokorga bog'langan hisob (bo'lsa) — chatda avtomatik javob o'rniga haqiqiy shifokor javob beradi. */
export async function accountForRef(ref: string): Promise<any | null> {
  const accounts = await doctorAccounts();
  return accounts.find((u) => (u.doctorRef || u.id) === ref) || null;
}

/** Shifokorning bemorlari: unga yozilgan va ruxsatni bekor qilmagan bemorlar. */
export async function patientsOf(ref: string) {
  const appts: any[] = await prisma.appointment.findMany({ where: { doctorId: ref } });
  const active = appts.filter((a) => a.status !== "cancelled" && a.shareAccess !== false);
  const ids = Array.from(new Set(active.map((a) => a.userId)));
  const users = await Promise.all(ids.map((id) => prisma.user.findUnique({ where: { id } })));
  return ids
    .map((id, i) => {
      const u: any = users[i];
      if (!u) return null;
      const mine = active.filter((a) => a.userId === id).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
      return { id, name: u.name || mine[0]?.name || "Bemor", age: u.age ?? null, gender: u.gender ?? null, appointments: mine.map((a) => ({ id: a.id, date: a.date, time: a.time, reason: a.reason ?? null })) };
    })
    .filter(Boolean) as { id: string; name: string; age: number | null; gender: string | null; appointments: { id: string; date: string; time: string; reason: string | null }[] }[];
}

/** Shifokor shu bemorni ko'ra oladimi? Aks holda 403. */
export async function assertPatientAccess(ref: string, patientId: string) {
  const appts: any[] = await prisma.appointment.findMany({ where: { doctorId: ref, userId: patientId } });
  if (!appts.some((a) => a.status !== "cancelled" && a.shareAccess !== false)) {
    throw new HttpError(403, "Bu bemor sizga qabulga yozilmagan yoki maʼlumotlarini koʻrishga ruxsat bermagan");
  }
}

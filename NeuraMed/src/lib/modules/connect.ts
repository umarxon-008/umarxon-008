/**
 * MEDCONNECT — namunaviy shifokorlar va muassasalar, bo'sh vaqtlarni hisoblash.
 * Shifokorlar haqiqiy shaxslar emas; qabul real belgilanmaydi.
 */
// @ts-ignore — JS ma'lumot moduli
import { DOCTORS, CLINICS, DEMO_REPLIES } from "@/data/connect-data.js";
import { dayOffset, isoDay } from "./dates";

export interface Doctor { id: string; name: string; specialty: string; clinicId: string; experience: number; languages: string[]; rating: number; workDays: number[]; hours: [number, number]; color: string; about: string }
export interface Clinic { id: string; name: string; type: string; city: string; address: string; hours: string; departments: string[] }

export const doctors = DOCTORS as Doctor[];
export const clinics = CLINICS as Clinic[];
export const demoReplies = DEMO_REPLIES as string[];
export const doctorById = (id: string) => doctors.find((d) => d.id === id) || null;
export const clinicById = (id: string) => clinics.find((c) => c.id === id) || null;

/** Shifokorning yaqin 10 ish kunidagi vaqtlari (band vaqtlar belgilangan). */
export function slotsFor(doc: Doctor, taken: { date: string; time: string }[], days = 10) {
  const takenSet = new Set(taken.map((t) => `${t.date} ${t.time}`));
  const now = new Date();
  const out: { date: string; slots: { time: string; free: boolean }[] }[] = [];
  for (let i = 0; out.length < days && i < 30; i += 1) {
    const d = dayOffset(i);
    if (!doc.workDays.includes(d.getDay())) continue;
    const day = isoDay(d);
    const slots: { time: string; free: boolean }[] = [];
    for (let h = doc.hours[0]; h < doc.hours[1]; h += 1) {
      for (const m of ["00", "30"]) {
        const time = `${String(h).padStart(2, "0")}:${m}`;
        if (new Date(`${day}T${time}`) <= now) continue;
        slots.push({ time, free: !takenSet.has(`${day} ${time}`) });
      }
    }
    if (slots.some((s) => s.free)) out.push({ date: day, slots });
  }
  return out;
}

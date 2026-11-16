/**
 * Hayotiy ko'rsatkichlar: turlar, ruxsat etilgan oraliq va umumiy baholash qoidalari.
 * Chegaralar umumqabul qilingan kattalar ko'rsatkichlari — tashxis emas; shifokor boshqacha belgilashi mumkin.
 * Matnlar o'zbekcha kalit sifatida qaytadi (brauzerda t() bilan tarjima qilinadi).
 */

export type VitalType = "bp" | "pulse" | "weight" | "glucose" | "temp" | "spo2" | "sleep";
export type Level = "ok" | "info" | "warn" | "danger";

export interface VitalDef {
  type: VitalType;
  label: string;
  unit: string;
  min: number;
  max: number;
  min2?: number;
  max2?: number;
  step: number;
}

export const VITALS: VitalDef[] = [
  { type: "bp", label: "Qon bosimi", unit: "mm sim. ust.", min: 60, max: 260, min2: 30, max2: 160, step: 1 },
  { type: "pulse", label: "Puls", unit: "zarba/daq", min: 25, max: 230, step: 1 },
  { type: "glucose", label: "Qondagi qand", unit: "mmol/l", min: 1, max: 35, step: 0.1 },
  { type: "weight", label: "Vazn", unit: "kg", min: 2, max: 350, step: 0.1 },
  { type: "temp", label: "Tana harorati", unit: "°C", min: 33, max: 43, step: 0.1 },
  { type: "spo2", label: "Kislorod (SpO₂)", unit: "%", min: 50, max: 100, step: 1 },
  { type: "sleep", label: "Uyqu", unit: "soat", min: 0, max: 24, step: 0.5 },
];

export const vitalDef = (t: string) => VITALS.find((v) => v.type === t) || null;

export interface Msg { text: string; vars?: Record<string, string | number> }
export interface Assessment { level: Level; title: Msg; advice: Msg[]; emergency: boolean }

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Oldingi o'lchovlardan shaxsiy "odatiy" qiymat (mediana). */
export function baselineOf(history: { value: number; value2?: number | null }[]) {
  const last = history.slice(0, 20);
  return { value: median(last.map((h) => h.value)), value2: median(last.filter((h) => h.value2 != null).map((h) => h.value2 as number)) };
}

/** Bitta o'lchovni baholash. history — shu turdagi oldingi o'lchovlar (yangidan eskiga). */
export function assessVital(type: VitalType, value: number, value2: number | null | undefined, history: { value: number; value2?: number | null }[], heightCm?: number | null): Assessment {
  const ok = (title: string, vars?: Msg["vars"]): Assessment => ({ level: "ok", title: { text: title, vars }, advice: [], emergency: false });
  const base = baselineOf(history);
  const callNote: Msg = { text: "Kuchli koʻkrak ogʻrigʻi, nafas qisishi, nutq buzilishi yoki hushdan ketish boʻlsa — darhol 103 ga qoʻngʻiroq qiling." };

  switch (type) {
    case "bp": {
      const sys = value, dia = value2 ?? 0;
      if (sys >= 180 || dia >= 120)
        return { level: "danger", emergency: true, title: { text: "Juda yuqori bosim: {sys}/{dia}", vars: { sys, dia } }, advice: [{ text: "5 daqiqa tinch oʻtirib, qayta oʻlchang." }, callNote, { text: "Belgilar boʻlmasa ham, bugunoq shifokor bilan bogʻlaning." }] };
      if (sys >= 140 || dia >= 90) {
        const above = base.value != null && sys >= base.value + 15;
        return { level: "warn", emergency: false, title: above ? { text: "Odatdagidan yuqori: {sys}/{dia} (odatda ~{bs}/{bd})", vars: { sys, dia, bs: Math.round(base.value as number), bd: Math.round((base.value2 ?? 0) as number) } } : { text: "Bosim yuqori: {sys}/{dia}", vars: { sys, dia } }, advice: [{ text: "15 daqiqa tinch oʻtirib, qayta oʻlchang." }, { text: "Bir necha kun davomida yuqori boʻlsa, terapevt yoki kardiologga yoziling." }, callNote] };
      }
      if (sys < 90 || dia < 60) return { level: "warn", emergency: false, title: { text: "Bosim past: {sys}/{dia}", vars: { sys, dia } }, advice: [{ text: "Bosh aylanishi yoki holsizlik boʻlsa, oʻtiring va shifokorga murojaat qiling." }] };
      if (base.value != null && sys >= base.value + 15) return { level: "info", emergency: false, title: { text: "Meʼyorda, lekin odatdagidan biroz yuqori: {sys}/{dia}", vars: { sys, dia } }, advice: [{ text: "Keyingi kunlarda kuzatib boring." }] };
      return ok("Bosim meʼyorda: {sys}/{dia}", { sys, dia });
    }
    case "pulse":
      if (value > 130 || value < 40) return { level: "danger", emergency: false, title: { text: value > 130 ? "Puls juda tez: {v}" : "Puls juda sekin: {v}", vars: { v: value } }, advice: [{ text: "Tinch holatda qayta oʻlchang; takrorlansa, shifokorga murojaat qiling." }, callNote] };
      if (value > 100 || value < 50) return { level: "warn", emergency: false, title: { text: "Tinch holatdagi puls meʼyordan tashqarida: {v}", vars: { v: value } }, advice: [{ text: "Jismoniy faollik, qahva yoki hayajondan keyin oshishi mumkin. Tinch holatda qayta oʻlchang." }] };
      return ok("Puls meʼyorda: {v}", { v: value });
    case "glucose":
      if (value < 3.9) return { level: "danger", emergency: value < 3.0, title: { text: "Qand past: {v} mmol/l", vars: { v: value } }, advice: [{ text: "Gipoglikemiya belgilari (titrash, terlash, holsizlik) boʻlsa, yaqinlaringizga ayting va shifokoringiz bergan reja boʻyicha harakat qiling." }, callNote] };
      if (value >= 13.9) return { level: "danger", emergency: false, title: { text: "Qand juda yuqori: {v} mmol/l", vars: { v: value } }, advice: [{ text: "Bugunoq shifokor bilan bogʻlaning." }, callNote] };
      if (value > 7.0) return { level: "warn", emergency: false, title: { text: "Qand yuqori: {v} mmol/l", vars: { v: value } }, advice: [{ text: "Och qoringa oʻlchanganmi — shuni belgilang. Takrorlansa, endokrinologga yoziling." }] };
      return ok("Qand meʼyorda: {v} mmol/l", { v: value });
    case "temp":
      if (value >= 39.5) return { level: "danger", emergency: false, title: { text: "Yuqori isitma: {v} °C", vars: { v: value } }, advice: [{ text: "Koʻp suyuqlik iching va shifokor bilan bogʻlaning." }, callNote] };
      if (value >= 37.5) return { level: "warn", emergency: false, title: { text: "Harorat koʻtarilgan: {v} °C", vars: { v: value } }, advice: [{ text: "3 kundan ortiq davom etsa yoki ahvol yomonlashsa, terapevtga murojaat qiling." }] };
      if (value < 35.5) return { level: "warn", emergency: false, title: { text: "Harorat past: {v} °C", vars: { v: value } }, advice: [{ text: "Isining va qayta oʻlchang; past boʻlib qolsa, shifokorga murojaat qiling." }] };
      return ok("Harorat meʼyorda: {v} °C", { v: value });
    case "spo2":
      if (value < 90) return { level: "danger", emergency: true, title: { text: "Kislorod juda past: {v}%", vars: { v: value } }, advice: [{ text: "Darhol 103 ga qoʻngʻiroq qiling." }] };
      if (value < 95) return { level: "warn", emergency: false, title: { text: "Kislorod meʼyordan past: {v}%", vars: { v: value } }, advice: [{ text: "Qayta oʻlchang; nafas qisishi boʻlsa, shifokorga murojaat qiling." }] };
      return ok("Kislorod meʼyorda: {v}%", { v: value });
    case "sleep":
      if (value < 6) return { level: "warn", emergency: false, title: { text: "Uyqu kam: {v} soat", vars: { v: value } }, advice: [{ text: "Kattalar uchun odatda 7–9 soat uyqu tavsiya etiladi." }] };
      if (value > 10) return { level: "info", emergency: false, title: { text: "Uyqu odatdagidan koʻp: {v} soat", vars: { v: value } }, advice: [{ text: "Doimiy holsizlik boʻlsa, terapevt bilan muhokama qiling." }] };
      return ok("Uyqu yetarli: {v} soat", { v: value });
    case "weight": {
      if (!heightCm) return ok("Vazn: {v} kg", { v: value });
      const bmi = Math.round((value / (heightCm / 100) ** 2) * 10) / 10;
      if (bmi >= 30) return { level: "warn", emergency: false, title: { text: "TVI {bmi} — semizlik oraligʻi", vars: { bmi } }, advice: [{ text: "Ovqatlanish va faollik rejasini shifokor bilan tuzing." }] };
      if (bmi >= 25) return { level: "info", emergency: false, title: { text: "TVI {bmi} — ortiqcha vazn oraligʻi", vars: { bmi } }, advice: [{ text: "Faollik va ovqatlanishni kuzatib boring." }] };
      if (bmi < 18.5) return { level: "warn", emergency: false, title: { text: "TVI {bmi} — vazn yetishmasligi", vars: { bmi } }, advice: [{ text: "Sababini aniqlash uchun terapevt bilan maslahatlashing." }] };
      return ok("TVI {bmi} — meʼyorda", { bmi });
    }
  }
}

/** Demo hisob uchun 14 kunlik namunaviy o'lchovlar. */
export function demoVitals(userId: string) {
  const out: { userId: string; type: VitalType; value: number; value2?: number; at: Date; note?: string }[] = [];
  const day = (d: number, h: number) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, 0, 0, 0); return x; };
  const wobble = (i: number, a: number) => Math.round(Math.sin(i * 1.7) * a);
  for (let d = 13; d >= 0; d--) {
    const i = 13 - d;
    const high = d <= 1; // oxirgi ikki kun — AIVITA misolidagi kabi odatdagidan yuqori
    out.push({ userId, type: "bp", value: high ? 142 - d * 3 : 123 + wobble(i, 4), value2: high ? 91 - d * 2 : 79 + wobble(i + 2, 3), at: day(d, 8), note: "namuna" });
    out.push({ userId, type: "pulse", value: 72 + wobble(i, 6), at: day(d, 8), note: "namuna" });
    if (d % 2 === 0) out.push({ userId, type: "glucose", value: Math.round((5.2 + Math.sin(i) * 0.4) * 10) / 10, at: day(d, 7), note: "namuna" });
    if (d % 3 === 0) out.push({ userId, type: "weight", value: Math.round((60.4 - i * 0.05) * 10) / 10, at: day(d, 7), note: "namuna" });
    out.push({ userId, type: "sleep", value: [7, 6.5, 7.5, 5.5, 8, 7, 6][i % 7], at: day(d, 9), note: "namuna" });
  }
  return out;
}

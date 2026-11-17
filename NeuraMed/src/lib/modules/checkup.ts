/**
 * Chekap (Health Score): shifokor bemor bilan birga to'ldiradigan so'rovnoma (turmush tarzi va shikoyatlar).
 * Ball — salomatlikka g'amxo'rlik ko'rsatkichi, TASHXIS EMAS. Matnlar o'zbekcha kalit (t() bilan tarjima).
 */
export type Area = "heart" | "digest" | "musculo" | "nerve" | "immune";

export const AREAS: { id: Area; label: string }[] = [
  { id: "heart", label: "Yurak va qon tomirlar" },
  { id: "digest", label: "Hazm tizimi" },
  { id: "musculo", label: "Tayanch-harakat" },
  { id: "nerve", label: "Asab tizimi va uyqu" },
  { id: "immune", label: "Immunitet" },
];

export interface Option { label: string; score: number; flag?: "urgent" | "emergency" }
export interface Question { id: string; text: string; areas: Area[]; options: Option[] }

export const QUESTIONS: Question[] = [
  { id: "activity", text: "Haftada necha kun kamida 30 daqiqa jismoniy faollik qilasiz?", areas: ["heart", "musculo"], options: [{ label: "Deyarli hech", score: 20 }, { label: "1–2 kun", score: 55 }, { label: "3–4 kun", score: 85 }, { label: "5 kun va undan koʻp", score: 100 }] },
  { id: "smoking", text: "Chekasizmi (sigaret, nos, vape)?", areas: ["heart", "immune"], options: [{ label: "Yoʻq", score: 100 }, { label: "Tashlaganman", score: 80 }, { label: "Baʼzan", score: 45 }, { label: "Har kuni", score: 15 }] },
  { id: "chest", text: "Ko‘krak og‘rig‘i yoki hansirash bo‘ladimi?", areas: ["heart"], options: [{ label: "Yoʻq", score: 100 }, { label: "Faqat katta yuklamada", score: 70 }, { label: "Oddiy yurganda ham", score: 25, flag: "urgent" }, { label: "Hozir, tinch holatda", score: 0, flag: "emergency" }] },
  { id: "food", text: "Kuniga meva va sabzavotni necha marta iste’mol qilasiz?", areas: ["digest", "immune"], options: [{ label: "Kamdan-kam", score: 30 }, { label: "1–2 marta", score: 65 }, { label: "3 va undan koʻp", score: 100 }] },
  { id: "digest", text: "Qorin ogʻrigʻi, zarda qaynashi yoki ich qotishi bezovta qiladimi?", areas: ["digest"], options: [{ label: "Yoʻq", score: 100 }, { label: "Baʼzan", score: 65 }, { label: "Haftada bir necha marta", score: 30, flag: "urgent" }] },
  { id: "pain", text: "Bel, boʻyin yoki boʻgʻimlarda ogʻriq bormi?", areas: ["musculo"], options: [{ label: "Yoʻq", score: 100 }, { label: "Baʼzan", score: 65 }, { label: "Doimiy", score: 30 }] },
  { id: "sleep", text: "Odatda necha soat uxlaysiz?", areas: ["nerve"], options: [{ label: "6 soatdan kam", score: 35 }, { label: "6–7 soat", score: 70 }, { label: "7–9 soat", score: 100 }, { label: "9 soatdan koʻp", score: 70 }] },
  { id: "stress", text: "Oxirgi 2 haftada stress yoki xavotirni qanchalik his qildingiz?", areas: ["nerve", "immune"], options: [{ label: "Kam", score: 100 }, { label: "Oʻrtacha", score: 65 }, { label: "Kuchli", score: 30 }] },
  { id: "headache", text: "Bosh og‘rig‘i qanchalik tez-tez bo‘ladi?", areas: ["nerve"], options: [{ label: "Kamdan-kam", score: 100 }, { label: "Haftada 1–2 marta", score: 60 }, { label: "Deyarli har kuni", score: 25, flag: "urgent" }] },
  { id: "colds", text: "Yiliga necha marta shamollaysiz?", areas: ["immune"], options: [{ label: "0–1 marta", score: 100 }, { label: "2–3 marta", score: 70 }, { label: "4 va undan koʻp", score: 35 }] },
  { id: "water", text: "Kuniga qancha suv ichasiz?", areas: ["digest", "immune"], options: [{ label: "1 litrdan kam", score: 40 }, { label: "1–2 litr", score: 85 }, { label: "2 litrdan koʻp", score: 100 }] },
];

const TIPS: Record<Area, string[]> = {
  heart: ["Haftada kamida 150 daqiqa oʻrtacha faollik (masalan, tez yurish) yurak uchun foydali.", "Chekishni tashlash boʻyicha shifokordan yordam soʻrang."],
  digest: ["Har kuni meva-sabzavot va yetarli suv iching.", "Shikoyatlar takrorlansa, gastroenterolog yoki terapevtga yoziling."],
  musculo: ["Uzoq oʻtirganda har soatda 5 daqiqa harakat qiling.", "Doimiy ogʻriq boʻlsa, nevrolog yoki terapevt bilan maslahatlashing."],
  nerve: ["Bir xil vaqtda yotib, 7–9 soat uxlashga harakat qiling.", "Kuchli stress uzoq davom etsa, mutaxassis bilan gaplashing — bu odatiy holat."],
  immune: ["Yetarli uyqu, ovqatlanish va faollik immunitetni qoʻllab-quvvatlaydi.", "Emlash jadvali boʻyicha poliklinika bilan maslahatlashing."],
};

export function scoreCheckup(answers: Record<string, number>) {
  const per: Record<Area, number[]> = { heart: [], digest: [], musculo: [], nerve: [], immune: [] };
  const flags: { question: string; answer: string; flag: "urgent" | "emergency" }[] = [];
  for (const q of QUESTIONS) {
    const idx = answers[q.id];
    const opt = typeof idx === "number" ? q.options[idx] : undefined;
    if (!opt) throw new Error("incomplete");
    q.areas.forEach((a) => per[a].push(opt.score));
    if (opt.flag) flags.push({ question: q.text, answer: opt.label, flag: opt.flag });
  }
  const areas = AREAS.map((a) => ({ id: a.id, label: a.label, score: Math.round(per[a.id].reduce((s, x) => s + x, 0) / per[a.id].length) }));
  const score = Math.round(areas.reduce((s, a) => s + a.score, 0) / areas.length);
  const weakest = [...areas].sort((a, b) => a.score - b.score).filter((a) => a.score < 80).slice(0, 2);
  const tips = weakest.flatMap((a) => TIPS[a.id].map((text) => ({ area: a.label, text })));
  return { score, areas, flags, tips, emergency: flags.some((f) => f.flag === "emergency") };
}

export const scoreBand = (s: number) => (s >= 80 ? { key: "good", label: "Yaxshi" } : s >= 60 ? { key: "fair", label: "Oʻrtacha — eʼtibor bering" } : { key: "low", label: "Eʼtibor talab qiladi" });

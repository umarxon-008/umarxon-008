// NeuraMed — Shaxsiy profil asosida xavfsizlik ogohlantirishlari va PII-siz AI konteksti
import { normalizeDrugName } from "@/lib/api/drug-sources";
import type { MedicationInfo, PersonalSafetyAlert } from "@/types";

export interface ClinicalContextProfile {
  age?: number | null;
  gender?: string | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  pregnancyStatus?: string | null;
}

/**
 * AI'ga yuborish uchun shaxsiy identifikatorsiz (ism, telefon, email, ID yo'q) kontekst yaratadi.
 */
export function buildAnonymousUserContext(profile: ClinicalContextProfile): string {
  const parts: string[] = [];
  if (profile.age) parts.push(`Yosh: ${profile.age}`);
  if (profile.gender && profile.gender !== "PREFER_NOT_TO_SAY") {
    parts.push(`Jins: ${profile.gender}`);
  }
  if (profile.allergies.length > 0) {
    parts.push(`Allergiyalar: ${profile.allergies.join(", ")}`);
  }
  if (profile.chronicConditions.length > 0) {
    parts.push(`Surunkali kasalliklar: ${profile.chronicConditions.join(", ")}`);
  }
  if (profile.currentMedications.length > 0) {
    parts.push(`Hozirgi dorilar: ${profile.currentMedications.join(", ")}`);
  }
  if (profile.pregnancyStatus && profile.pregnancyStatus !== "NOT_APPLICABLE") {
    parts.push(`Homiladorlik/emizish holati: ${profile.pregnancyStatus}`);
  }
  return parts.join(" | ");
}

const PENICILLIN_FAMILY = ["amoxicillin", "ampicillin", "penicillin", "piperacillin"];
const NSAID_FAMILY = ["ibuprofen", "diclofenac", "naproxen", "ketoprofen", "ketorolac", "aspirin", "meloxicam", "nimesulide", "celecoxib"];
const SULFA_FAMILY = ["sulfamethoxazole", "trimethoprim", "biseptol", "furosemide"];

/**
 * Foydalanuvchi profilidagi allergiya, homiladorlik, surunkali holatlar va joriy dorilarni
 * ko'rilayotgan dori ma'lumotlari bilan solishtirib, ogohlantirishlar qaytaradi.
 */
export function evaluateMedicationPersonalAlerts(
  info: MedicationInfo,
  profile: ClinicalContextProfile,
  activeReminderMeds: string[] = []
): PersonalSafetyAlert[] {
  const alerts: PersonalSafetyAlert[] = [];
  const genericNorm = normalizeDrugName(info.generic_name || info.drug_name);
  const drugLower = `${info.drug_name} ${info.generic_name} ${(info.brand_names || []).join(" ")}`.toLowerCase();
  const labelCorpus = [
    info.purpose,
    ...(info.serious_warnings || []),
    ...(info.avoid_with || []),
    info.lifestyle_warnings?.liver || "",
    info.lifestyle_warnings?.kidney || "",
    info.lifestyle_warnings?.pregnancy || "",
    info.lifestyle_warnings?.breastfeeding || "",
  ]
    .join(" ")
    .toLowerCase();

  // 1. Allergiya tekshiruvi
  for (const rawAllergy of profile.allergies) {
    const a = rawAllergy.trim().toLowerCase();
    if (!a) continue;
    const normA = normalizeDrugName(a);
    const directMatch = drugLower.includes(a) || drugLower.includes(normA) || genericNorm.includes(normA);
    const penicillinMatch =
      (a.includes("penitsil") || a.includes("penicil") || a.includes("пеницил")) &&
      PENICILLIN_FAMILY.some((p) => genericNorm.includes(p) || drugLower.includes(p));
    const nsaidMatch =
      (a.includes("nimes") || a.includes("aspirin") || a.includes("ibuprofen") || a.includes("nyavs") || a.includes("npvs")) &&
      NSAID_FAMILY.some((p) => genericNorm.includes(p) || drugLower.includes(p));
    const sulfaMatch =
      (a.includes("sulfa") || a.includes("biseptol")) &&
      SULFA_FAMILY.some((p) => genericNorm.includes(p) || drugLower.includes(p));

    if (directMatch || penicillinMatch || nsaidMatch || sulfaMatch) {
      alerts.push({
        level: "danger",
        title: `Allergiya ogohlantirishi: "${rawAllergy}"`,
        description: `Sizning tibbiy profilingizda "${rawAllergy}" ga allergiya qayd etilgan. Ushbu dorini qabul qilishdan oldin albatta shifokor yoki farmatsevt bilan maslahatlashing.`,
      });
    }
  }

  // 2. Homiladorlik / emizish
  if (profile.pregnancyStatus === "PREGNANT" || profile.pregnancyStatus === "PLANNING") {
    alerts.push({
      level: "warning",
      title: "Homiladorlik / rejalashtirish holati",
      description:
        info.lifestyle_warnings?.pregnancy ||
        "Profilingizda homiladorlik holati ko'rsatilgan. Har qanday dorini shifokor ruxsatisiz qabul qilmang.",
    });
  } else if (profile.pregnancyStatus === "BREASTFEEDING") {
    alerts.push({
      level: "warning",
      title: "Emizish davri ogohlantirishi",
      description:
        info.lifestyle_warnings?.breastfeeding ||
        "Profilingizda emizish davri ko'rsatilgan. Dori ona sutiga o'tishi mumkinligi haqida shifokor bilan maslahatlashing.",
    });
  }

  // 3. Surunkali kasalliklar (jigar, buyrak, oshqozon, qon bosimi, diabet)
  for (const cond of profile.chronicConditions) {
    const c = cond.trim().toLowerCase();
    if (!c) continue;
    if (/(jigar|gepat|liver|печен)/i.test(c) && (info.lifestyle_warnings?.liver || /liver|hepat|jigar/i.test(labelCorpus))) {
      alerts.push({
        level: "warning",
        title: `Jigar bilan bog'liq ehtiyotkorlik ("${cond}")`,
        description:
          info.lifestyle_warnings?.liver ||
          "Profilingizdagi jigar holati tufayli ushbu dorini shifokor nazoratisiz ichish tavsiya etilmaydi.",
      });
    }
    if (/(buyrak|nefr|renal|kidney|почк)/i.test(c) && (info.lifestyle_warnings?.kidney || /kidney|renal|buyrak/i.test(labelCorpus))) {
      alerts.push({
        level: "warning",
        title: `Buyrak bilan bog'liq ehtiyotkorlik ("${cond}")`,
        description:
          info.lifestyle_warnings?.kidney ||
          "Profilingizdagi buyrak holati sababli shifokor bilan maslahatlashing.",
      });
    }
    if (/(oshqozon|gastrit|yara|ulcer|язва)/i.test(c) && NSAID_FAMILY.some((n) => genericNorm.includes(n))) {
      alerts.push({
        level: "warning",
        title: `Oshqozon himoyasi ("${cond}")`,
        description:
          "Ushbu guruhdagi og'riq qoldiruvchi dorilar oshqozon shilliq qavatini ta'sirlantirishi mumkin. Shifokor bilan maslahatlashing.",
      });
    }
  }

  // 4. Joriy dorilar va faol eslatmalar bilan takrorlanish / ehtiyotkorlik
  const allCurrentMeds = Array.from(
    new Set([...profile.currentMedications, ...activeReminderMeds].map((m) => m.trim()).filter(Boolean))
  );

  for (const med of allCurrentMeds) {
    const medFirst = med.split(/\s+/)[0]?.toLowerCase() || "";
    const normMed = normalizeDrugName(medFirst);
    if (!normMed || normMed.length < 3) continue;

    if (normMed === genericNorm) {
      alerts.push({
        level: "warning",
        title: `Bir xil faol modda aniqlanmoqda ("${med}")`,
        description: `Sizning joriy ro'yxatingizda tarkibida "${genericNorm}" bo'lgan "${med}" mavjud. Bir vaqtda ikki xil nomdagi bir xil moddani ichib, sutkalik me'yorni oshirib yubormaslik uchun shifokor bilan tekshiring.`,
      });
    } else if (labelCorpus.includes(normMed) || labelCorpus.includes(medFirst)) {
      alerts.push({
        level: "info",
        title: `O'zaro ta'sir ehtimoli ("${med}")`,
        description: `Rasmiy yo'riqnomada "${med}" bilan birga qabul qilishda ehtiyot bo'lish haqida eslatma uchramoqda. Shifokor yoki farmatsevtdan aniqlashtiring.`,
      });
    }
  }

  return alerts;
}

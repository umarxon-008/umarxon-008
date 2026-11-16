// NeuraMed — Laboratoriya ko'rsatkichlarini blankadan ajratish va deterministik tekshirish
import type { LabMarker } from "@/types";

interface MarkerDef {
  name: string;
  uzbekName: string;
  aliases: RegExp;
  defaultUnit: string;
  defaultRange?: { min: number; max: number; text: string };
}

const KNOWN_MARKERS: MarkerDef[] = [
  {
    name: "Hemoglobin",
    uzbekName: "Gemoglobin (qondagi kislorod tashuvchi oqsil)",
    aliases: /\b(hemoglobin|gemoglobin|гемоглобин|hgb|hb)\b/i,
    defaultUnit: "g/dL",
    defaultRange: { min: 12.0, max: 16.5, text: "12.0 - 16.5 g/dL" },
  },
  {
    name: "Glucose",
    uzbekName: "Glyukoza (qondagi qand miqdori)",
    aliases: /\b(glucose|glyukoza|глюкоза|qand)\b/i,
    defaultUnit: "mmol/L",
    defaultRange: { min: 3.9, max: 5.9, text: "3.9 - 5.9 mmol/L" },
  },
  {
    name: "Creatinine",
    uzbekName: "Kreatinin (buyrak filtratsiyasi ko'rsatkichi)",
    aliases: /\b(creatinine|kreatinin|креатинин|crea)\b/i,
    defaultUnit: "µmol/L",
    defaultRange: { min: 53, max: 115, text: "53 - 115 µmol/L" },
  },
  {
    name: "ALT",
    uzbekName: "ALT (jigar fermenti)",
    aliases: /\b(alt|alat|алт|алат)\b/i,
    defaultUnit: "U/L",
    defaultRange: { min: 7, max: 45, text: "7 - 45 U/L" },
  },
  {
    name: "AST",
    uzbekName: "AST (jigar va yurak fermenti)",
    aliases: /\b(ast|asat|аст|асат)\b/i,
    defaultUnit: "U/L",
    defaultRange: { min: 8, max: 40, text: "8 - 40 U/L" },
  },
  {
    name: "TSH",
    uzbekName: "TTG / TSH (qalqonsimon bez gormoni)",
    aliases: /\b(tsh|ttg|ттг)\b/i,
    defaultUnit: "mIU/L",
    defaultRange: { min: 0.4, max: 4.0, text: "0.4 - 4.0 mIU/L" },
  },
  {
    name: "WBC",
    uzbekName: "Leykotsitlar (oq qon tanachalari)",
    aliases: /\b(wbc|leukocytes|leykotsitlar|лейкоциты)\b/i,
    defaultUnit: "×10⁹/L",
    defaultRange: { min: 4.0, max: 10.0, text: "4.0 - 10.0 ×10⁹/L" },
  },
  {
    name: "Platelets",
    uzbekName: "Trombotsitlar (qon ivish hujayralari)",
    aliases: /\b(plt|platelets|trombotsitlar|тромбоциты)\b/i,
    defaultUnit: "×10⁹/L",
    defaultRange: { min: 150, max: 400, text: "150 - 400 ×10⁹/L" },
  },
  {
    name: "ESR",
    uzbekName: "EChT / SOE (eritrotsitlar cho'kish tezligi)",
    aliases: /\b(esr|echt|соэ|soe)\b/i,
    defaultUnit: "mm/soat",
    defaultRange: { min: 2, max: 20, text: "2 - 20 mm/soat" },
  },
  {
    name: "Cholesterol",
    uzbekName: "Umumiy xolesterin",
    aliases: /\b(cholesterol|xolesterin|холестерин)\b/i,
    defaultUnit: "mmol/L",
    defaultRange: { min: 3.0, max: 5.2, text: "3.0 - 5.2 mmol/L" },
  },
];

export function applyDeterministicStatus(m: LabMarker): LabMarker {
  const numVal = typeof m.value === "number" ? m.value : parseFloat(String(m.value).replace(",", "."));
  const min = m.normalRange?.min;
  const max = m.normalRange?.max;

  if (!isNaN(numVal) && min !== undefined && max !== undefined && max > min) {
    const status: LabMarker["status"] = numVal < min ? "low" : numVal > max ? "high" : "normal";
    const statusLabel = status === "low" ? "Past" : status === "high" ? "Yuqori" : "Normal";
    const span = max - min;
    const isUrgent =
      Boolean(m.isUrgent) ||
      numVal < min - span * 0.5 ||
      numVal > max + span * 0.8 ||
      (min > 0 && numVal / min < 0.65) ||
      numVal / max > 1.75;

    const explanation =
      m.explanation ||
      (status === "normal"
        ? "Ko'rsatkich referent (normal) diapazon ichida."
        : `Bu qiymat normal diapazondan ${status === "low" ? "past" : "yuqori"}, bu bir nechta sababga bog'liq bo'lishi mumkin, shifokor bilan muhokama qiling.`);

    const doctorQuestion =
      m.doctorQuestion ||
      (status === "normal"
        ? undefined
        : `${m.uzbekName || m.name} ko'rsatkichim (${m.value} ${m.unit}) normal diapazondan ${status === "low" ? "past" : "yuqori"} chiqibdi — buning sababi nima bo'lishi mumkin?`);

    return {
      ...m,
      value: numVal,
      status,
      statusLabel,
      isUrgent,
      explanation,
      doctorQuestion,
    };
  }

  return m;
}

export function parseLabMarkers(text: string): LabMarker[] {
  if (!text) return [];
  const results: LabMarker[] = [];

  for (const def of KNOWN_MARKERS) {
    const lineRe = new RegExp(
      `${def.aliases.source}[^\\n\\r]{0,40}?(\\d+(?:[.,]\\d+)?)\\s*([a-zA-Zµμ/0-9^×%]+)?(?:[^\\n\\r]{0,25}?(\\d+(?:[.,]\\d+)?)\\s*[-–—]\\s*(\\d+(?:[.,]\\d+)?))?`,
      "i"
    );
    const match = text.match(lineRe);
    if (!match || !match[2]) continue;

    const val = parseFloat(match[2].replace(",", "."));
    if (isNaN(val)) continue;

    const unit = match[3] || def.defaultUnit;
    let min = match[4] ? parseFloat(match[4].replace(",", ".")) : def.defaultRange?.min;
    let max = match[5] ? parseFloat(match[5].replace(",", ".")) : def.defaultRange?.max;

    // g/L vs g/dL normalization for Hemoglobin
    if (def.name === "Hemoglobin" && val > 45 && min !== undefined && min < 25) {
      min = 120;
      max = 165;
    }

    const rangeText =
      min !== undefined && max !== undefined
        ? `${min} - ${max} ${unit}`
        : def.defaultRange?.text || "Blankada ko'rsatilmagan";

    results.push(
      applyDeterministicStatus({
        name: def.name,
        uzbekName: def.uzbekName,
        value: val,
        unit,
        normalRange: { min, max, text: rangeText },
        status: "unknown",
        statusLabel: "Noma'lum",
        isUrgent: false,
      })
    );
  }

  return results;
}

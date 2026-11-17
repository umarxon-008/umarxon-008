// NeuraMed — AI qatlami (OpenAI). Har bir javob:
//  1) faqat JSON (response_format=json_object)
//  2) zod bilan tekshiriladi
//  3) xavfsizlik filtridan o'tadi (tashxis/buyruq iboralari olib tashlanadi)
//  4) disclaimer va manba server tomonidan majburan qo'yiladi
// OPENAI_API_KEY bo'lmasa — deterministik fallback (rasmiy matn / qoida asosida), taxminsiz.

import OpenAI from "openai";
import { z } from "zod";
import { CHAT_SYSTEM,
  MEDICATION_PROMPT,
  LAB_REPORT_PROMPT,
  IMAGING_REPORT_PROMPT,
  DOCTOR_VISIT_PROMPT,
  DISCLAIMER_TEXT,
} from "./prompts";
import type {
  MedicationInfo,
  LabReportAIResult,
  LabMarker,
  ImagingReportAIResult,
  DoctorVisitAIResult,
  DoctorVisitInput,
} from "@/types";
import { buildLabelText, type RawDrugData } from "@/lib/api/drug-sources";
import { redactPII } from "@/lib/encryption";
import { parseLabMarkers, applyDeterministicStatus } from "@/lib/ocr/lab-parser";

export { DISCLAIMER_TEXT };

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
let client: OpenAI | null | undefined;

export function isAIEnabled(): boolean {
  const key = process.env.OPENAI_API_KEY || "";
  return key.startsWith("sk-") && !key.includes("your-openai");
}

function getClient(): OpenAI | null {
  if (client !== undefined) return client;
  client = isAIEnabled() ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
  return client;
}

async function callAI(systemPrompt: string, userContent: string): Promise<unknown | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const completion = await c.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (error) {
    console.error("AI chaqiruvi xatosi:", error instanceof Error ? error.message : error);
    return null;
  }
}

// ── Xavfsizlik filtri ─────────────────────────────────────────────────────────

const UNSAFE_PATTERNS: RegExp[] = [
  /sizda\s+[^.!?\n]{0,60}\s(bor|aniqlandi|mavjud)\b[^.!?\n]*/gi,
  /\b(shu|bu|ushbu)\s+dori(ni)?\s+(iching|qabul qiling)\b[^.!?\n]*/gi,
  /\bdozani\s+(oshiring|kamaytiring|ikki barobar)\b[^.!?\n]*/gi,
  /\bdorini\s+to'?xtating\b[^.!?\n]*/gi,
  /\byou have\s+[^.!?\n]*/gi,
];
const SAFE_REPLACEMENT = "Bu haqda shifokor bilan maslahatlashing";

function sanitizeString(s: string): string {
  let out = s;
  for (const re of UNSAFE_PATTERNS) out = out.replace(re, SAFE_REPLACEMENT);
  return out;
}

export function sanitizeDeep<T>(value: T): T {
  if (typeof value === "string") return sanitizeString(value) as T;
  if (Array.isArray(value)) return value.map((v) => sanitizeDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = k === "source" || k === "url" ? v : sanitizeDeep(v);
    }
    return out as T;
  }
  return value;
}

const str = z.preprocess((v) => (v == null ? "" : String(v)), z.string());
const strArr = z.preprocess(
  (v) => (Array.isArray(v) ? v.filter((x) => x != null).map(String) : typeof v === "string" && v ? [v] : []),
  z.array(z.string())
);
const nullableStr = z.preprocess((v) => (v == null || v === "" ? null : String(v)), z.string().nullable());

// ── 1. Dori ───────────────────────────────────────────────────────────────────

const MedicationSchema = z.object({
  drug_name: str,
  generic_name: str,
  brand_names: strArr,
  form: str,
  purpose: str,
  how_to_take: str,
  timing: str,
  food_rule: z.enum(["ovqat_bilan", "bosh_qorin", "ahamiyatsiz"]).catch("ahamiyatsiz"),
  food_rule_note: str,
  frequency: str,
  dosage: str,
  missed_dose: str,
  common_side_effects: strArr,
  serious_warnings: strArr,
  avoid_with: strArr,
  lifestyle_warnings: z
    .object({
      alcohol: nullableStr,
      pregnancy: nullableStr,
      breastfeeding: nullableStr,
      driving: nullableStr,
      liver: nullableStr,
      kidney: nullableStr,
    })
    .catch({ alcohol: null, pregnancy: null, breastfeeding: null, driving: null, liver: null, kidney: null }),
  when_to_call_doctor: strArr,
});

export async function explainMedication(raw: RawDrugData): Promise<MedicationInfo | null> {
  const labelText = buildLabelText(raw);
  if (!labelText.trim()) return null;

  const source = {
    provider: raw.provider,
    setid: raw.setid,
    url: raw.sourceUrl,
    last_updated: raw.lastUpdated,
  };
  const sourceVerified = Boolean(source.url && source.url.startsWith("https://") && source.last_updated && source.last_updated !== "Noma'lum");

  const userContent = `DORI: ${raw.query} (standart nom: ${raw.standardName})
MANBA: provider=${source.provider}; setid=${source.setid ?? ""}; url=${source.url}; last_updated=${source.last_updated}

RASMIY LABEL MATNI (faqat shundan foydalan):
"""
${labelText}
"""`;

  const aiRaw = await callAI(MEDICATION_PROMPT, userContent);
  if (aiRaw) {
    const parsed = MedicationSchema.safeParse(aiRaw);
    if (parsed.success) {
      const aiSource = (aiRaw as { source?: { url?: string } }).source;
      return sanitizeDeep({
        ...parsed.data,
        drug_name: parsed.data.drug_name || raw.query,
        generic_name: parsed.data.generic_name || raw.standardName,
        disclaimer: DISCLAIMER_TEXT,
        source, // har doim real API'dan — AI'ga ishonilmaydi
        source_verified: sourceVerified && (aiSource?.url ? aiSource.url === source.url : true),
        generated_by: "ai" as const,
      });
    }
    console.error("AI JSON zod tekshiruvidan o'tmadi");
  }

  return extractFromLabel(raw, source, sourceVerified);
}

/** AI mavjud bo'lmaganda: rasmiy label bo'limlarini to'g'ridan-to'g'ri kartalarga joylaydi (tarjimasiz, taxminsiz). */
function extractFromLabel(
  raw: RawDrugData,
  source: MedicationInfo["source"],
  sourceVerified: boolean
): MedicationInfo {
  const f = raw.fdaLabel;
  const s = raw.dailyMedSections;
  const pick = (arr?: string[], max = 600) => (arr?.join(" ") ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const sec = (needle: string, max = 600) => {
    const k = Object.keys(s).find((key) => key.includes(needle));
    return k ? s[k].slice(0, max) : "";
  };
  const sentences = (text: string, n = 5) =>
    text
      .split(/(?<=[.;])\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length > 15)
      .slice(0, n);

  const dosageText = pick(f?.dosage_and_administration, 900) || sec("dosage", 900);
  const lower = (dosageText + " " + pick(f?.warnings, 2000)).toLowerCase();
  const food_rule: MedicationInfo["food_rule"] = /empty stomach|before meals/.test(lower)
    ? "bosh_qorin"
    : /with food|with meals|with milk/.test(lower)
      ? "ovqat_bilan"
      : "ahamiyatsiz";

  const warningsText = pick(f?.boxed_warning, 800) + " " + (pick(f?.warnings ?? f?.warnings_and_cautions, 1500) || sec("warning", 1500));

  return {
    drug_name: f?.openfda?.brand_name?.[0] ?? raw.query,
    generic_name: f?.openfda?.generic_name?.[0] ?? raw.standardName,
    brand_names: f?.openfda?.brand_name?.slice(0, 5) ?? [],
    form: pick(f?.dosage_forms_and_strengths, 120) || f?.openfda?.route?.[0] || raw.dailyMedTitle || "",
    purpose: pick(f?.purpose ?? f?.indications_and_usage, 600) || sec("indication"),
    how_to_take: dosageText,
    timing: "",
    food_rule,
    food_rule_note:
      food_rule === "ahamiyatsiz" ? "Rasmiy yo'riqnomada ovqat bo'yicha alohida ko'rsatma topilmadi." : "Rasmiy yo'riqnomaga asoslangan.",
    frequency: "",
    dosage: "",
    missed_dose: "",
    common_side_effects: sentences(pick(f?.adverse_reactions, 1200) || sec("adverse", 1200)),
    serious_warnings: sentences(warningsText, 6),
    avoid_with: sentences(pick(f?.drug_interactions, 1000) || sec("interaction", 1000)),
    lifestyle_warnings: {
      alcohol: /alcohol/i.test(warningsText) ? sentences(warningsText.match(/[^.]*alcohol[^.]*\./i)?.[0] ?? "", 1)[0] ?? null : null,
      pregnancy: pick(f?.pregnancy ?? f?.pregnancy_or_breast_feeding, 400) || sec("pregnan", 400) || null,
      breastfeeding: pick(f?.nursing_mothers, 300) || null,
      driving: null,
      liver: /liver|hepat/i.test(warningsText) ? warningsText.match(/[^.]*(liver|hepat)[^.]*\./i)?.[0]?.trim() ?? null : null,
      kidney: /kidney|renal/i.test(warningsText) ? warningsText.match(/[^.]*(kidney|renal)[^.]*\./i)?.[0]?.trim() ?? null : null,
    },
    when_to_call_doctor: sentences(pick(f?.stop_use ?? f?.ask_doctor, 800) || sec("stop use", 800)),
    disclaimer: DISCLAIMER_TEXT,
    source,
    source_verified: sourceVerified,
    generated_by: "label_extract",
  };
}

// ── 2. Laboratoriya tahlili ───────────────────────────────────────────────────

const MarkerSchema = z.object({
  name: str,
  uzbekName: str.optional(),
  value: z.union([z.number(), z.string()]).catch(""),
  unit: str,
  normalRange: z
    .object({
      min: z.preprocess((v) => (v == null || v === "" ? undefined : Number(v)), z.number().optional()).catch(undefined),
      max: z.preprocess((v) => (v == null || v === "" ? undefined : Number(v)), z.number().optional()).catch(undefined),
      text: str,
    })
    .catch({ text: "" }),
  status: z.enum(["low", "normal", "high", "unknown"]).catch("unknown"),
  statusLabel: str,
  isUrgent: z.boolean().catch(false),
  explanation: str.optional(),
  doctorQuestion: str.optional(),
});

const LabSchema = z.object({
  summary: str,
  markers: z.array(MarkerSchema).catch([]),
  key_points: strArr,
  warnings: strArr,
  urgent_markers: strArr,
  next_steps: strArr.optional(),
  questions_for_doctor: strArr,
});

const URGENT_TEXT = "Bu natija shifokor bilan tezroq muhokama qilinishi kerak.";

export async function explainLabReport(ocrText: string): Promise<LabReportAIResult | null> {
  if (!ocrText.trim()) return null;
  const redacted = redactPII(ocrText).slice(0, 6000);
  const ruleMarkers = parseLabMarkers(redacted);
  const today = new Date().toISOString().split("T")[0];

  const aiRaw = await callAI(
    LAB_REPORT_PROMPT,
    `Laboratoriya tahlili matni (OCR, shaxsiy ma'lumotlar olib tashlangan):\n"""\n${redacted}\n"""`
  );
  const parsed = aiRaw ? LabSchema.safeParse(aiRaw) : null;

  let markers: LabMarker[] = parsed?.success && parsed.data.markers.length ? parsed.data.markers : ruleMarkers;
  markers = markers.map(applyDeterministicStatus); // AI qiymatiga ko'r-ko'rona ishonmaymiz

  const urgent = markers.filter((m) => m.isUrgent);
  const abnormal = markers.filter((m) => m.status === "low" || m.status === "high");

  const base: LabReportAIResult = parsed?.success
    ? {
        ...parsed.data,
        markers,
        next_steps: parsed.data.next_steps ?? [],
        disclaimer: DISCLAIMER_TEXT,
        source: { provider: "Foydalanuvchi yuklagan laboratoriya blankasi", last_updated: today },
      }
    : {
        summary: markers.length
          ? `Blankadan ${markers.length} ta ko'rsatkich ajratildi. ${abnormal.length} tasi blankadagi normal diapazondan tashqarida. Bu bir nechta sababga bog'liq bo'lishi mumkin — natijalarni shifokor bilan muhokama qiling.`
          : "Blankadan ko'rsatkichlarni avtomatik ajratib bo'lmadi. Iltimos, asl hujjatni shifokorga ko'rsating.",
        markers,
        key_points: markers.map(
          (m) => `${m.uzbekName || m.name}: ${m.value} ${m.unit} — ${m.statusLabel.toLowerCase()} (normal: ${m.normalRange.text || "ko'rsatilmagan"})`
        ),
        warnings: [],
        urgent_markers: [],
        next_steps: ["Natijalarni davolovchi shifokoringizga ko'rsating."],
        questions_for_doctor: [
          ...abnormal.map((m) => `${m.uzbekName || m.name} normal diapazondan ${m.status === "low" ? "past" : "yuqori"} — buning sabablari nima bo'lishi mumkin?`),
          "Qo'shimcha tekshiruv yoki tahlilni qayta topshirish kerakmi?",
          "Keyingi nazorat tahlilini qachon topshirishim kerak?",
        ].slice(0, 8),
        disclaimer: DISCLAIMER_TEXT,
        source: { provider: "Foydalanuvchi yuklagan laboratoriya blankasi (qoida asosida tahlil)", last_updated: today },
      };

  if (urgent.length) {
    base.urgent_markers = Array.from(
      new Set([...base.urgent_markers, ...urgent.map((m) => `${m.uzbekName || m.name}: ${m.value} ${m.unit}`)])
    );
    if (!base.warnings.includes(URGENT_TEXT)) base.warnings.unshift(URGENT_TEXT);
  }
  return sanitizeDeep(base);
}

// ── 3. Rentgen / radiologiya hisoboti ─────────────────────────────────────────

const ImagingSchema = z.object({
  summary: str,
  terms_explained: z
    .array(z.object({ term: str, simple_explanation: str, context: str.optional() }))
    .catch([]),
  key_findings: strArr,
  warnings: strArr.optional(),
  questions_for_doctor: strArr,
  next_steps: strArr,
});

const RADIOLOGY_GLOSSARY: Record<string, string> = {
  infiltration: "Infiltratsiya — to'qimada suyuqlik yoki hujayralar to'planib, tasvirda zichroq ko'rinadigan soha.",
  consolidation: "Konsolidatsiya — o'pkadagi havo pufakchalari havo o'rniga suyuqlik/to'qima bilan to'lgani sababli zich ko'rinishi.",
  cardiomegaly: "Kardiomegaliya — tasvirda yurak soyasining odatdagidan kattaroq ko'rinishi.",
  "pleural effusion": "Plevral effuziya — o'pkani o'rab turgan parda qavatlari orasida suyuqlik to'planishi.",
  atelectasis: "Atelektaz — o'pkaning bir qismi to'liq havo bilan to'lmay, puchayib qolishi.",
  fibrosis: "Fibroz — to'qimada chandiqsimon (biriktiruvchi to'qima) o'zgarish.",
  opacity: "Opasite (soyalanish) — tasvirda odatdagidan oqroq (zichroq) ko'ringan soha.",
  nodule: "Tugun (nodul) — kichik, dumaloq zichlashgan soha; tabiati shifokor tomonidan baholanadi.",
  pneumothorax: "Pnevmotoraks — o'pka va ko'krak devori orasida havo to'planishi. Nafas qisishi bo'lsa darhol yordam so'rang.",
  emphysema: "Emfizema — o'pka havo pufakchalari kengayib, elastikligi kamayishi.",
  osteophyte: "Osteofit — suyak chetida o'sgan kichik suyak bo'rtig'i.",
  osteochondrosis: "Osteoxondroz — umurtqalar orasidagi disklarning yosh yoki yuklama bilan bog'liq o'zgarishi.",
  fracture: "Sinish — suyak butunligining buzilishi.",
  unremarkable: "Unremarkable — 'alohida o'zgarish ko'rinmadi' degan ma'noni bildiradi.",
  "no acute": "No acute ... — 'o'tkir (yangi, shoshilinch) o'zgarish ko'rinmadi' degan ma'no.",
};

export async function explainImagingReport(reportText: string): Promise<ImagingReportAIResult | null> {
  if (!reportText.trim()) return null;
  const redacted = redactPII(reportText).slice(0, 6000);
  const today = new Date().toISOString().split("T")[0];
  const source = { provider: "Foydalanuvchi yuklagan radiologiya hisoboti", last_updated: today };

  const aiRaw = await callAI(IMAGING_REPORT_PROMPT, `Radiologiya hisoboti matni:\n"""\n${redacted}\n"""`);
  const parsed = aiRaw ? ImagingSchema.safeParse(aiRaw) : null;
  if (parsed?.success) {
    return sanitizeDeep({ ...parsed.data, disclaimer: DISCLAIMER_TEXT, source });
  }

  const lower = redacted.toLowerCase();
  const terms = Object.entries(RADIOLOGY_GLOSSARY)
    .filter(([k]) => lower.includes(k))
    .map(([term, simple_explanation]) => ({ term, simple_explanation, context: "Hisobot matnida uchradi." }));

  return {
    summary: terms.length
      ? `Hisobotda ${terms.length} ta tibbiy atama topildi va quyida oddiy tilda izohlandi. Hisobotning yakuniy ma'nosini shifokoringiz tasvir va shikoyatlaringiz bilan birga baholaydi.`
      : "Hisobotda lug'atimizdagi atamalar topilmadi. Hisobotni shifokoringiz bilan ko'rib chiqing.",
    terms_explained: terms,
    key_findings: [],
    warnings: ["Nafas qisishi, ko'krakda kuchli og'riq yoki yuqori isitma bo'lsa — darhol tibbiy yordam so'rang (103)."],
    questions_for_doctor: [
      "Hisobotdagi bu o'zgarishlar mening shikoyatlarim bilan bog'liqmi?",
      "Qo'shimcha tekshiruv kerakmi?",
      "Nazorat tasvirini qachon qayta olish kerak?",
      ...terms.slice(0, 4).map((t) => `"${t.term}" mening holatimda nimani anglatadi?`),
    ],
    next_steps: ["Hisobot va tasvirni davolovchi shifokorga ko'rsating."],
    disclaimer: DISCLAIMER_TEXT,
    source,
  };
}

// ── 4. Shifokor qabuliga tayyorlov ────────────────────────────────────────────

const DoctorSchema = z.object({
  summary: str,
  symptoms_list: strArr,
  urgency_level: z.enum(["low", "medium", "high", "emergency"]).catch("medium"),
  urgency_note: str,
  emergency_signs: strArr.optional(),
  questions_for_doctor: strArr,
  documents_to_bring: strArr,
  preparation_tips: strArr.optional(),
});

const EMERGENCY_PATTERNS: [RegExp, string][] = [
  [/ko'?krak.{0,20}(og'?ri|sanch|siqil)|chest pain|боль в груди/i, "Ko'krak qafasida og'riq"],
  [/nafas.{0,15}(qis|olol|yetish)|bo'?g'il|shortness of breath|одышк|задыха/i, "Nafas qisishi"],
  [/hush(i|dan).{0,10}(ket|yo'?qot)|faint|обморок/i, "Hushdan ketish"],
  [/falaj|yuz.{0,10}qiyshay|nutq.{0,10}buzil|til.{0,10}aylanma|paralys|инсульт/i, "Insult belgilari (falaj, nutq buzilishi)"],
  [/qon.{0,10}(qus|ket|tupur)|bleeding|кровотеч/i, "Qon ketishi"],
  [/o'?z joniga|suicid|суицид/i, "O'ziga zarar yetkazish fikrlari"],
  [/tutqanoq|seizure|судорог/i, "Tutqanoq"],
  [/anafilak|tomoq.{0,10}shish|yuz.{0,10}shish/i, "Kuchli allergik reaksiya"],
];

export function detectEmergency(input: DoctorVisitInput): string[] {
  const text = input.symptoms.join(" ");
  const found = EMERGENCY_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);
  const t = parseFloat((input.temperatureValue || "").replace(",", "."));
  if (!isNaN(t) && t >= 39.5) found.push(`Yuqori harorat (${t}°C)`);
  return found;
}

export async function prepareDoctorVisit(input: DoctorVisitInput): Promise<DoctorVisitAIResult | null> {
  const emergencies = detectEmergency(input);
  const userContent = redactPII(
    `Foydalanuvchi ma'lumotlari:
Belgilar: ${input.symptoms.join(", ")}
Davom etish muddati: ${input.duration}
Harorat: ${input.hasTemperature ? "Ha" + (input.temperatureValue ? ` (${input.temperatureValue}°C)` : "") : "Yo'q"}
Allergiyalar: ${input.allergies.join(", ") || "Yo'q"}
Hozirgi dorilar: ${input.currentMedications.join(", ") || "Yo'q"}
Surunkali kasalliklar: ${input.chronicConditions.join(", ") || "Yo'q"}
${input.pregnancyNote ? `Homiladorlik/emizish: ${input.pregnancyNote}` : ""}`.trim()
  );

  const aiRaw = await callAI(DOCTOR_VISIT_PROMPT, userContent);
  const parsed = aiRaw ? DoctorSchema.safeParse(aiRaw) : null;

  const result: DoctorVisitAIResult = parsed?.success
    ? { ...parsed.data, disclaimer: DISCLAIMER_TEXT }
    : {
        summary: `${input.symptoms.length} ta belgi, ${input.duration || "muddati ko'rsatilmagan"}. Quyidagi ro'yxat va savollar qabulda vaqtni tejashga yordam beradi.`,
        symptoms_list: input.symptoms,
        urgency_level: input.hasTemperature ? "medium" : "low",
        urgency_note: "Rejali tarzda shifokor qabuliga yoziling. Holat yomonlashsa — kechiktirmang.",
        questions_for_doctor: [
          "Bu belgilar nimalar bilan bog'liq bo'lishi mumkin?",
          "Qanday tahlil yoki tekshiruvlar topshirishim kerak?",
          input.currentMedications.length
            ? `Hozir ichayotgan dorilarim (${input.currentMedications.join(", ")}) bu belgilarga ta'sir qilishi mumkinmi?`
            : "Qabulgacha nimalarga e'tibor berishim kerak?",
          input.allergies.length ? `Allergiyam (${input.allergies.join(", ")}) davolash rejasida hisobga olinadimi?` : "Qaysi belgilar paydo bo'lsa darhol murojaat qilishim kerak?",
          input.chronicConditions.length
            ? `Surunkali holatim (${input.chronicConditions.join(", ")}) bilan bog'liq ehtiyot choralari bormi?`
            : "Turmush tarzimda nimani o'zgartirishim kerak?",
          "Qachon qayta nazoratga kelishim kerak?",
        ],
        documents_to_bring: [
          "Pasport / ID karta",
          "Oldingi tahlil va tekshiruv natijalari",
          "Hozir ichayotgan dorilar ro'yxati yoki qadoqlari",
          "Allergiyalar va surunkali kasalliklar ro'yxati",
          "Belgilar kundaligi (qachon boshlangan, qanday o'zgargan)",
        ],
        preparation_tips: ["Savollaringizni oldindan yozib oling.", "Harorat va bosimni o'lchab yozib boring."],
        disclaimer: DISCLAIMER_TEXT,
      };

  if (emergencies.length) {
    result.urgency_level = "emergency";
    result.urgency_note = "Darhol tibbiy yordam so‘rang (103). Kiritilgan belgilar shoshilinch ko'rikni talab qilishi mumkin.";
    result.emergency_signs = Array.from(new Set([...(result.emergency_signs ?? []), ...emergencies]));
  }
  return sanitizeDeep(result);
}


// ── MEDAI chat (erkin savol-javob) ────────────────────────────────────────────
export interface ChatTurn { role: "user" | "assistant"; content: string }

/** OpenAI orqali chat javobi. Kalit bo'lmasa yoki xato bo'lsa — null (chaqiruvchi demo javobga o'tadi). */
const LANG_LINE: Record<string, string> = {
  uz: "",
  ru: "\n\nОтвечай на русском языке, соблюдая все правила выше.",
  en: "\n\nAnswer in English, following all the rules above.",
  kk: "\n\nЖоғарыдағы барлық ережелерді сақтай отырып, қазақ тілінде жауап бер.",
  ky: "\n\nЖогорудагы бардык эрежелерди сактап, кыргыз тилинде жооп бер.",
  tg: "\n\nБо риояи ҳамаи қоидаҳои боло ба забони тоҷикӣ ҷавоб деҳ.",
};

export async function chatAssistant(history: ChatTurn[], locale = "uz"): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const completion = await c.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 900,
      messages: [{ role: "system", content: CHAT_SYSTEM + (LANG_LINE[locale] || "") }, ...history.slice(-20)],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text ? sanitizeString(text) : null;
  } catch (error) {
    console.error("MEDAI chat xatosi:", error instanceof Error ? error.message : error);
    return null;
  }
}

const QUALITY_SYSTEM = `Siz NeuraMed platformasining farmatsevtika sifati boʻyicha yordamchisisiz.
Vazifa: berilgan JSON (dori partiyasi, sertifikatlar, laboratoriya natijalari, taʼminot zanjiri, mahalliy muqobillar) asosida bemorga 4–6 ta qisqa band bilan oddiy tilda tushuntirish.
Qoidalar:
- Faqat JSON'dagi faktlardan foydalaning, hech narsa toʻqimang. Maʼlumotlar namunaviy ekanini bir marta eslating.
- Tashxis qoʻymang, doza aytmang, dorini almashtirishni buyurmang: almashtirishni shifokor yoki farmatsevt bilan kelishishni tavsiya qiling.
- Me'yordan tashqari laboratoriya natijasi yoki shubhali zanjir boʻlsa, buni aniq ayting va dorixonaga yoki vakolatli idoraga murojaat qilishni tavsiya qiling.
- Mahalliy dori boʻlsa yoki mahalliy muqobil boʻlsa, sifat dalillarini (sertifikat, laboratoriya) xolis koʻrsating.
- Markdown roʻyxat ishlating, sarlavhasiz.`;

/** №17: sertifikat va laboratoriya natijalarini oddiy tilda tushuntirish (AI). Kalit bo'lmasa null. */
export async function explainQuality(data: unknown, locale = "uz"): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const completion = await c.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        { role: "system", content: QUALITY_SYSTEM + (LANG_LINE[locale] || "") },
        { role: "user", content: JSON.stringify(data).slice(0, 6000) },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text ? sanitizeString(text) : null;
  } catch (error) {
    console.error("[ai] explainQuality failed", error instanceof Error ? error.name : "Error");
    return null;
  }
}

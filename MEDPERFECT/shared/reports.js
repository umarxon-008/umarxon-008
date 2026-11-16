/**
 * Demo rejimdagi tahlil va yo'riqnoma javoblarini yig'ish (server va brauzer uchun umumiy).
 * Barcha natijalar qoidaga asoslangan — AI emas.
 */
import { parseLabText } from './labParser.js';
import { parseLeaflet } from './leafletParser.js';
import { clip } from './text.js';

export const MAX_LEAFLET_CHARS = 30000;

export const BASE_LIMITATIONS = [
  'Qiymatlar hujjatdan avtomatik ajratildi — oʻqishda xato boʻlishi mumkin, shuning uchun ularni hujjat bilan solishtirib tasdiqlashingiz soʻraladi.',
  'Reference range (meʼyoriy oraliq) laboratoriya, uskuna, yosh, jins, homiladorlik va boshqa omillarga qarab farq qiladi.',
  'Solishtirish faqat hujjatda yozilgan oraliq asosida qilinadi. Oraliq yozilmagan boʻlsa, baho berilmaydi.',
  'Bu talqin tashxis emas va shifokor xulosasi oʻrnini bosmaydi.',
];

export const MEDICINE_SAFETY_NOTE =
  'MEDAI dori dozasini, davolash kursini yoki boshqa doriga almashtirishni tavsiya qilmaydi. Dori sizga mosligini shifokor yoki farmatsevt aniqlaydi.';

export const NOTICES = {
  labImage: 'Demo rejimda rasmdan matn oʻqish (OCR) mavjud emas — buning uchun AI ulanishi kerak. Qiymatlarni hujjatga qarab qoʻlda kiritishingiz mumkin.',
  labScan: 'PDF ichida oʻqiladigan matn topilmadi (skanerlangan hujjat boʻlishi mumkin). Demo rejimda OCR mavjud emas — qiymatlarni qoʻlda kiriting.',
  medName: 'Dori nomi boʻyicha maʼlumot olish uchun AI yoki rasmiy dori bazasi kerak. Demo rejimda bu funksiya mavjud emas — yoʻriqnoma faylini (PDF/TXT) yuklang, matnini joylashtiring yoki «Namuna yoʻriqnoma» tugmasini bosing.',
  medImage: 'Demo rejimda rasmdan matn oʻqish (OCR) mavjud emas. Yoʻriqnomaning PDF yoki matn (TXT) shaklini yuklang yoki matnni joylashtiring.',
  medNoText: 'Fayldan oʻqiladigan matn topilmadi (skanerlangan hujjat boʻlishi mumkin). Demo rejimda OCR mavjud emas.',
};

const toItem = (i) => ({
  name: clip(i.name, 80),
  value: clip(i.value ?? '', 20),
  unit: clip(i.unit ?? '', 24),
  referenceRange: clip(i.referenceRange ?? '', 40),
});

export function labItemFromAi(i) {
  return toItem({ name: i.name, value: i.value, unit: i.unit, referenceRange: i.reference_range });
}

/** Matnli laboratoriya hujjatidan demo javob. */
export function demoAnalysis(text, file) {
  if (String(text ?? '').replace(/\s/g, '').length < 20) {
    return { mode: 'demo', file, ocrUnavailable: true, testName: '', items: [], limitations: BASE_LIMITATIONS, notice: NOTICES.labScan };
  }
  const parsed = parseLabText(text);
  return {
    mode: 'demo',
    file,
    testName: parsed.title ? clip(parsed.title, 120) : '',
    items: parsed.items.map((i) => toItem({ name: i.name, value: i.valueText, unit: i.unit, referenceRange: i.rangeText })),
    limitations: BASE_LIMITATIONS,
    notice: parsed.items.length
      ? 'Koʻrsatkichlar qoidaga asoslangan algoritm bilan ajratildi (AI emas).'
      : 'Hujjatdan koʻrsatkichlar aniqlanmadi. Hujjat formati notanish boʻlishi mumkin — qiymatlarni qoʻlda kiriting.',
  };
}

export function demoAnalysisImage(file) {
  return { mode: 'demo', file, ocrUnavailable: true, testName: '', items: [], limitations: BASE_LIMITATIONS, notice: NOTICES.labImage };
}

/** Yo'riqnoma matnidan demo javob (bo'limlar sarlavhalar bo'yicha ajratiladi). */
export function demoLeaflet(text) {
  const base = { mode: 'demo', model: null, safetyNote: MEDICINE_SAFETY_NOTE, source: 'document' };
  if (String(text ?? '').replace(/\s/g, '').length < 30) return { ...base, unavailable: true, notice: NOTICES.medNoText };
  const p = parseLeaflet(clip(text, MAX_LEAFLET_CHARS));
  return {
    ...base,
    medicine: {
      name: p.name, activeSubstance: p.activeSubstance, indications: p.indications, contraindications: p.contraindications,
      sideEffects: p.sideEffects, interactions: p.interactions, storage: p.storage, documentDate: p.documentDate,
      sourceNote: 'Foydalanuvchi yuklagan yoʻriqnoma matni. Boʻlimlar sarlavhalar boʻyicha avtomatik ajratildi (AI emas); matn oʻzgartirilmagan.',
    },
    dosageOmitted: p.dosageSectionFound,
    notice: p.recognizedSections ? '' : 'Yoʻriqnoma boʻlimlari (masalan, «Qarshi koʻrsatmalar») aniqlanmadi. Matn rasmiy yoʻriqnoma formatida ekanini tekshiring.',
  };
}

export function demoMedicineUnavailable(source, notice) {
  return { mode: 'demo', model: null, safetyNote: MEDICINE_SAFETY_NOTE, source, unavailable: true, notice };
}

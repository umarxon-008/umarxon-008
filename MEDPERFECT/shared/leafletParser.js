/**
 * Dori yo'riqnomasi matnini bo'limlarga ajratadi (qoidaga asoslangan, AI emas).
 * Matn mazmuni o'zgartirilmaydi — faqat sarlavhalar bo'yicha ajratiladi.
 * Dozalash bo'limi ataylab natijaga kiritilmaydi.
 */
import { normalize, clip } from './text.js';

const HEADINGS = {
  name: ['savdo nomi', 'dori nomi', 'preparat nomi', 'торговое название', 'торговое наименование', 'trade name', 'product name'],
  activeSubstance: ["ta'sir etuvchi modda", 'faol modda', 'tarkibi', 'действующее вещество', 'состав', 'active substance', 'active ingredient', 'composition', 'xalqaro patentlanmagan nomi', 'мнн'],
  indications: ["qo'llanilishi", "qo'llash uchun ko'rsatmalar", "qo'llanilish sohasi", "qo'llanish sohasi", 'показания к применению', 'показания', 'indications', 'therapeutic indications'],
  contraindications: ["qo'llash mumkin bo'lmagan holatlar", "qarshi ko'rsatmalar", 'противопоказания', 'contraindications'],
  sideEffects: ["nojo'ya ta'sirlari", "nojo'ya ta'sirlar", "nojo'ya ta'sir", 'побочные действия', 'побочное действие', 'побочные эффекты', 'side effects', 'adverse reactions', 'undesirable effects'],
  interactions: ["dorilararo o'zaro ta'siri", "dorilararo o'zaro ta'sir", "o'zaro ta'siri", "o'zaro ta'sir", 'лекарственное взаимодействие', 'взаимодействие', 'interactions', 'drug interactions'],
  storage: ['saqlash sharoiti', 'saqlash shartlari', 'saqlash', 'условия хранения', 'хранение', 'storage', 'storage conditions'],
  dosage: ["qo'llash usuli va dozalari", "qo'llash usuli va dozasi", 'dozalash', 'способ применения и дозы', 'способ применения', 'dosage and administration', 'dosage', 'posology'],
  other: ['maxsus ko\'rsatmalar', 'особые указания', 'chiqarilish shakli', 'форма выпуска', 'ishlab chiqaruvchi', 'производитель', 'manufacturer', 'warnings', 'precautions', 'homiladorlik', 'беременность', 'dozani oshirib yuborish', 'передозировка', 'overdose'],
};

const ALL = Object.entries(HEADINGS)
  .flatMap(([key, list]) => list.map((h) => ({ key, h })))
  .sort((a, b) => b.h.length - a.h.length);

function matchHeading(line) {
  // Uzunlikni saqlagan holda normallashtirish (apostroflar bitta belgiga almashadi).
  const lower = line.replace(/[\u02BB\u02BC\u2018\u2019\u0060\u00B4\u02B9]/g, "'").toLowerCase();
  const lead = lower.match(/^[\d.)\s-]*/)[0].length;
  const n = lower.slice(lead);
  for (const { key, h } of ALL) {
    if (!n.startsWith(h)) continue;
    const tail = n.slice(h.length);
    if (tail && !/^[\s:.\-–—]/.test(tail)) continue; // so'z chegarasi: "tarkibidagi" != "tarkibi"
    const hasSeparator = /^\s*[:.\-–—]/.test(tail);
    if (n.length > 90 && !hasSeparator) continue; // uzun oddiy gap sarlavha emas
    const inline = line.slice(lead + h.length).replace(/^[\s:.\-–—]+/, '').trim();
    return { key, inline };
  }
  return null;
}

const DATE_RE = /(?:sana|дата|revised|пересмотр|yangilangan|tasdiqlangan)[^\n\d]{0,40}(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4})/i;

export function parseLeaflet(text) {
  const src = String(text ?? '');
  const lines = src.split(/\r?\n/).map((l) => l.trim());
  const sections = {};
  let current = null;
  let firstLine = null;

  for (const line of lines) {
    if (!line) continue;
    if (!firstLine) firstLine = line;
    const h = matchHeading(line);
    if (h) {
      current = h.key;
      sections[current] = sections[current] || [];
      if (h.inline) sections[current].push(h.inline);
      continue;
    }
    if (current) sections[current].push(line);
  }

  const join = (k) => (sections[k] && sections[k].length ? clip(sections[k].join('\n'), 4000) : '');
  const nameFromSection = join('name').split('\n')[0] || '';
  const dateMatch = src.match(DATE_RE);

  return {
    name: nameFromSection || (firstLine && firstLine.length <= 80 ? firstLine : ''),
    activeSubstance: join('activeSubstance'),
    indications: join('indications'),
    contraindications: join('contraindications'),
    sideEffects: join('sideEffects'),
    interactions: join('interactions'),
    storage: join('storage'),
    documentDate: dateMatch ? dateMatch[1] : '',
    dosageSectionFound: Boolean(sections.dosage && sections.dosage.length),
    recognizedSections: Object.keys(sections).filter((k) => !['other', 'dosage'].includes(k)).length,
  };
}

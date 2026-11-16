// MEDPERFECT moduli (NeuraMed ga birlashtirilgan). Asl manba: MEDPERFECT/shared/
/**
 * Laboratoriya hujjati matnidan ko'rsatkichlarni QOIDAGA ASOSLANIB ajratadi (AI emas).
 * Muhim: reference range faqat hujjatda yozilgan bo'lsa olinadi — o'zimizdan to'qilmaydi.
 */
import { normalize, toNumber } from './text.js';

const NUM = String.raw`-?\d+(?:[.,]\d+)?`;
const RANGE_RE = new RegExp(String.raw`(${NUM})\s*(?:-|–|—|\.\.\.?|to|dan)\s*(${NUM})\s*$`, 'i');
const LT_RE = new RegExp(String.raw`(?:<|≤|<=|до|gacha)\s*(${NUM})\s*$`, 'i');
const GT_RE = new RegExp(String.raw`(?:>|≥|>=|от|dan yuqori)\s*(${NUM})\s*$`, 'i');
const FLAG_RE = /\s+(?:H|L|HH|LL|↑|↓|\*|!)\s*$/;
const TITLE_HINTS = ['tahlil', 'analiz', 'анализ', 'analysis', 'blood count', 'qon', 'panel', 'biokim', 'биохим', 'test'];
const SKIP_HINTS = ['sana', 'дата', 'date', 'f.i.sh', 'фио', 'patient', 'bemor', 'tel', 'manzil', 'адрес', 'id:', 'yosh', 'возраст'];

/** "120 - 160", "<5", ">30" kabi reference range matnini sonlarga aylantiradi. */
export function parseRange(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  let m = s.match(new RegExp(String.raw`^(${NUM})\s*(?:-|–|—|\.\.\.?|to|dan)\s*(${NUM})`, 'i'));
  if (m) {
    const low = toNumber(m[1]);
    const high = toNumber(m[2]);
    if (low !== null && high !== null && low <= high) return { low, high, text: s };
  }
  m = s.match(new RegExp(String.raw`^(?:<|≤|<=|до)\s*(${NUM})`, 'i'));
  if (m) return { low: null, high: toNumber(m[1]), text: s };
  m = s.match(new RegExp(String.raw`^(?:>|≥|>=|от)\s*(${NUM})`, 'i'));
  if (m) return { low: toNumber(m[1]), high: null, text: s };
  return null;
}

/** Qiymatni hujjatdagi oraliq bilan solishtirish: low | normal | high | unknown. */
export function compare(value, range) {
  if (value === null || value === undefined || !range) return 'unknown';
  if (range.low !== null && range.low !== undefined && value < range.low) return 'low';
  if (range.high !== null && range.high !== undefined && value > range.high) return 'high';
  return 'normal';
}

function parseLine(line) {
  let rest = line.replace(/\t/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (rest.length < 4 || rest.length > 160) return null;
  const lower = normalize(rest);
  if (SKIP_HINTS.some((h) => lower.startsWith(h))) return null;

  rest = rest.replace(FLAG_RE, '');
  let rangeText = null;
  let m = rest.match(RANGE_RE) || rest.match(LT_RE) || rest.match(GT_RE);
  if (m) {
    rangeText = m[0].trim();
    rest = rest.slice(0, m.index).trim();
  }
  rest = rest.replace(FLAG_RE, '');

  // Nom: kamida 2 ta harf; qiymat: nomdan keyingi birinchi son (bo'shliqdan keyin).
  const vm = rest.match(new RegExp(String.raw`^(.*?\p{L}.*?)\s+(${NUM})(?:\s+(.*))?$`, 'u'));
  if (!vm) return null;
  const name = vm[1].replace(/[:–—-]\s*$/, '').trim();
  const letters = (name.match(/\p{L}/gu) || []).length;
  if (letters < 2 || name.length > 60) return null;
  let unit = (vm[3] || '').replace(FLAG_RE, '').trim();
  if (unit.length > 20) return null;
  if (!rangeText && !unit) return null; // juda noaniq satr (masalan sana yoki raqamli matn)

  const value = toNumber(vm[2]);
  return { name, value, valueText: vm[2], unit: unit || null, rangeText };
}

function guessTitle(lines) {
  for (const l of lines.slice(0, 12)) {
    const n = normalize(l);
    if (n.length >= 4 && n.length <= 80 && TITLE_HINTS.some((h) => n.includes(h)) && !/\d{2}[./]\d{2}/.test(n)) {
      return l.trim();
    }
  }
  return null;
}

/** Hujjat matnidan { title, items[] } qaytaradi. */
export function parseLabText(text) {
  const lines = String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  const seen = new Set();
  for (const line of lines) {
    const item = parseLine(line);
    if (!item) continue;
    const key = normalize(item.name);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= 60) break;
  }
  return { title: guessTitle(lines), items };
}

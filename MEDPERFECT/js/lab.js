/**
 * Laboratoriya qiymatlarini hujjatdagi reference range bilan solishtirish (deterministik, AI emas).
 * Oraliq hujjatda bo'lmasa — baho berilmaydi ("unknown").
 */
const NUM = String.raw`-?\d+(?:[.,]\d+)?`;

export const toNumber = (s) => {
  const n = Number.parseFloat(String(s ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function parseRange(text) {
  const s = String(text ?? '').trim();
  if (!s) return null;
  let m = s.match(new RegExp(String.raw`^(${NUM})\s*(?:-|–|—|\.\.\.?|to|dan)\s*(${NUM})`, 'i'));
  if (m) {
    const low = toNumber(m[1]);
    const high = toNumber(m[2]);
    if (low !== null && high !== null && low <= high) return { low, high };
  }
  m = s.match(new RegExp(String.raw`^(?:<|≤|<=|до)\s*(${NUM})`, 'i'));
  if (m) return { low: null, high: toNumber(m[1]) };
  m = s.match(new RegExp(String.raw`^(?:>|≥|>=|от)\s*(${NUM})`, 'i'));
  if (m) return { low: toNumber(m[1]), high: null };
  return null;
}

/** 'low' | 'normal' | 'high' | 'unknown' */
export function compare(value, range) {
  if (value === null || !range) return 'unknown';
  if (range.low !== null && value < range.low) return 'low';
  if (range.high !== null && value > range.high) return 'high';
  return 'normal';
}

/** Qiymat oraliqdan sezilarli farq qiladimi (oddiy qoida: 2 baravardan ortiq). Bu tashxis emas. */
export function isMarkedDeviation(value, range) {
  if (value === null || !range) return false;
  if (range.high !== null && range.high > 0 && value > range.high * 2) return true;
  if (range.low !== null && range.low > 0 && value < range.low / 2) return true;
  return false;
}

/** Oraliq shkalasida marker joylashuvi (0–100%). */
export function markerPosition(value, range) {
  if (value === null || !range || range.low === null || range.high === null) return null;
  const span = range.high - range.low || Math.abs(range.high) || 1;
  const min = range.low - span * 0.5;
  const max = range.high + span * 0.5;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export const STATUS = {
  low: { label: 'Oraliqdan past', tone: 'warning', icon: 'arrow-down' },
  high: { label: 'Oraliqdan yuqori', tone: 'warning', icon: 'arrow-up' },
  normal: { label: 'Oraliq ichida', tone: 'success', icon: 'check' },
  unknown: { label: 'Baholanmadi', tone: 'muted', icon: 'circle-help' },
};

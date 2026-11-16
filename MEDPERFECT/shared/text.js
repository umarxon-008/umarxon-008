/** Matn bilan ishlash uchun umumiy yordamchi funksiyalar. */

/** Turli apostrof shakllarini (ʻ ʼ ‘ ’ ` ´) bitta ' ga keltiradi va kichik harfga o'tkazadi. */
export function normalize(str) {
  return String(str ?? '')
    .replace(/[ʻʼ‘’`´ʹ]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** "12,5" -> 12.5; son bo'lmasa null. */
export function toNumber(str) {
  if (str === null || str === undefined) return null;
  const n = Number.parseFloat(String(str).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function clip(str, max) {
  const s = String(str ?? '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Word Error Rate (WER): nutqni tanish aniqligini o'lchash uchun (prompt §8.5).
 * WER = (almashtirish + o'chirish + qo'shish) / kutilgan so'zlar soni. Aniqlik = 1 - WER.
 */

/** O'zbekcha matnni solishtirish uchun normallashtirish: apostrof turlari, katta-kichik harf, tinish belgilari. */
export function normalizeUz(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[ʻʼ‘’`´']/g, '‘') // o‘, g‘ va tutuq belgisining barcha ko'rinishlari bitta belgiga
    .replace(/[.,!?;:"“”«»()[\]—–…-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function wordErrors(reference: string[], hypothesis: string[]): number {
  const n = reference.length;
  const m = hypothesis.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      const cost = reference[i - 1] === hypothesis[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = cur;
  }
  return prev[m]!;
}

/** 0..1 (1 dan oshishi mumkin, agar ortiqcha so'zlar ko'p bo'lsa) */
export function wer(reference: string, hypothesis: string): number {
  const ref = normalizeUz(reference);
  if (ref.length === 0) return hypothesis.trim() ? 1 : 0;
  return wordErrors(ref, normalizeUz(hypothesis)) / ref.length;
}

/** Bir nechta natija bo'yicha umumiy WER (so'zlar soni bilan tortilgan) */
export function aggregateWer(results: { reference: string; hypothesis: string }[]): number {
  let errors = 0;
  let words = 0;
  for (const r of results) {
    const ref = normalizeUz(r.reference);
    errors += wordErrors(ref, normalizeUz(r.hypothesis));
    words += ref.length;
  }
  return words === 0 ? 0 : errors / words;
}

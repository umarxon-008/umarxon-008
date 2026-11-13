/** Ovoz balandligini hisoblash (DOM'siz sof funksiyalar, unit testda sinaladi). */

/** Signalning o'rtacha kvadrat ildizi (RMS), 0..1 */
export function rms(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]!;
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
}

/**
 * RMS'ni animatsiya uchun 0..1 darajaga aylantiradi.
 * -60 dB va undan past: jimlik (0), -12 dB va undan yuqori: baland ovoz (1).
 */
export function rmsToLevel(value: number, floorDb = -60, ceilDb = -12): number {
  if (value <= 0) return 0;
  const db = 20 * Math.log10(value);
  return Math.min(1, Math.max(0, (db - floorDb) / (ceilDb - floorDb)));
}

/**
 * Silliqlash: ovoz kuchayganda tez (attack), pasayganda sekin (release) javob beradi.
 * Shunda shar "nafas oladi" va titramaydi.
 */
export function smoothLevel(previous: number, target: number, attack = 0.35, release = 0.08): number {
  const k = target > previous ? attack : release;
  return previous + (target - previous) * k;
}

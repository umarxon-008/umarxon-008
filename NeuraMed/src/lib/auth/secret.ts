/**
 * JWT imzolash kaliti.
 * Production'da JWT_SECRET majburiy — aks holda hammaga ma'lum standart kalit bilan
 * sessiyani soxtalashtirish mumkin bo'lardi. Development'da ogohlantirish bilan vaqtinchalik kalit ishlatiladi.
 */
const DEV_FALLBACK = "neuramed-dev-only-secret-do-not-use-in-production";

export function getJwtSecret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (value && value.length >= 32) return new TextEncoder().encode(value);
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET kamida 32 belgidan iborat bo'lishi kerak (.env.local yoki hosting sozlamalari).");
  }
  if (!(globalThis as any).__neuramedSecretWarned) {
    (globalThis as any).__neuramedSecretWarned = true;
    console.warn("[NeuraMed] JWT_SECRET o'rnatilmagan — faqat development uchun vaqtinchalik kalit ishlatilmoqda.");
  }
  return new TextEncoder().encode(DEV_FALLBACK);
}

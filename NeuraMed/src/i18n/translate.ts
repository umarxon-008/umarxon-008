import type { Locale } from "./config";

/**
 * "Manba matn" usuli: kalit — o'zbekcha matnning o'zi. ru/en lug'atlari
 * o'zbekcha matnni tarjimaga moslaydi; tarjima topilmasa o'zbekcha qoladi.
 * {nom} ko'rinishidagi joylar vars bilan to'ldiriladi.
 */
export type Messages = Record<string, string>;
export type TFunction = (text: string, vars?: Record<string, string | number>) => string;

const norm = (s: string) => s.replace(/[ʻʼ‘’`]/g, "'");

export function makeT(messages: Messages | null): TFunction {
  let normalized: Messages | null = null;
  return (text, vars) => {
    let out = text;
    if (messages) {
      const hit = messages[text];
      if (hit !== undefined) out = hit;
      else {
        if (!normalized) { normalized = {}; for (const k in messages) normalized[norm(k)] = messages[k]; }
        const h2 = normalized[norm(text)];
        if (h2 !== undefined) out = h2;
      }
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    return out;
  };
}

export async function loadMessages(locale: Locale): Promise<Messages | null> {
  if (locale === "ru") return (await import("./messages/ru")).default;
  if (locale === "en") return (await import("./messages/en")).default;
  if (locale === "kk") return (await import("./messages/kk")).default;
  if (locale === "ky") return (await import("./messages/ky")).default;
  if (locale === "tg") return (await import("./messages/tg")).default;
  return null;
}

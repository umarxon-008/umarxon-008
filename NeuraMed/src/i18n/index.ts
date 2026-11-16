// Simple i18n utility — no extra library needed
// Supports uz, ru, en. Defaults to uz.

import type { Locale } from "./config";

const localeCache: Partial<Record<Locale, Record<string, unknown>>> = {};

async function loadLocale(locale: Locale) {
  if (localeCache[locale]) return localeCache[locale]!;
  const data = await import(`./locales/${locale}/common.json`);
  localeCache[locale] = data.default;
  return data.default as Record<string, unknown>;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (typeof current !== "object" || current === null) return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : path;
}

export async function t(key: string, locale: Locale = "uz"): Promise<string> {
  const messages = await loadLocale(locale);
  return getNestedValue(messages, key);
}

// Synchronous version using pre-loaded locale
export function createTranslator(messages: Record<string, unknown>) {
  return function t(key: string): string {
    return getNestedValue(messages, key);
  };
}

export type { Locale };

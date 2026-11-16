export type Locale = "uz" | "ru" | "en";
export const LOCALES: Locale[] = ["uz", "ru", "en"];
export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "neuramed_locale";
export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as string[]).includes(v);

import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { loadMessages, makeT, type TFunction } from "./translate";

/** Joriy til: cookie, bo'lmasa o'zbek. */
export function getLocale(): Locale {
  const c = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return DEFAULT_LOCALE;
}

export async function getT(locale: Locale = getLocale()): Promise<TFunction> {
  return makeT(await loadMessages(locale));
}


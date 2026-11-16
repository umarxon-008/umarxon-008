"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "./config";
import { makeT, type Messages, type TFunction } from "./translate";
import { useSettingsStore } from "@/store";

interface Ctx { locale: Locale; t: TFunction }
const I18nContext = React.createContext<Ctx>({ locale: "uz", t: makeT(null) });

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages | null; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ locale, t: makeT(messages) }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useT = () => React.useContext(I18nContext).t;
export const useLocale = () => React.useContext(I18nContext).locale;

/** Tilni almashtirish: cookie yoziladi va sahifa serverdan qayta chiziladi. */
export function useSetLocale() {
  const router = useRouter();
  const setStore = useSettingsStore((s) => s.setLocale);
  return React.useCallback((l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    setStore(l);
    document.documentElement.lang = l;
    router.refresh();
  }, [router, setStore]);
}

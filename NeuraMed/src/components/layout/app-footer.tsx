"use client";

import Link from "next/link";
import { useT } from "@/i18n/client";
import { BrandLogo } from "./brand-logo";

/** Umumiy footer: qisqa tavsif, havolalar, xavfsizlik eslatmasi. simple — kirish sahifalari uchun ixcham ko'rinish. */
export function AppFooter({ simple }: { simple?: boolean }) {
  const t = useT();
  const year = 2026;
  if (simple) {
    return (
      <footer className="px-4 py-6 text-center text-[11px] leading-relaxed text-slate-400">
        <p>{t("NeuraMed tashxis qoʻymaydi va dori buyurmaydi. Shoshilinch holatda — 103.")}</p>
        <p className="mt-1">© {year} NeuraMed · Toshkent AI Hackathon</p>
      </footer>
    );
  }
  return (
    <footer className="mt-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="mx-auto grid max-w-lg md:max-w-3xl lg:max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2">
          <BrandLogo size={36} withName />
          <p className="max-w-md text-sm text-slate-500">{t("Bemor va shifokor uchun yagona tibbiy platforma: tahlillar, dorilar, chekap, shifokor bilan aloqa va mahalliy dorilarga ishonch.")}</p>
        </div>
        <nav aria-label={t("Footer havolalari")} className="flex flex-wrap content-start gap-x-5 gap-y-2 text-sm">
          <Link href="/about" className="text-slate-600 dark:text-slate-300 hover:text-teal-700">{t("Loyiha haqida")}</Link>
          <Link href="/settings" className="text-slate-600 dark:text-slate-300 hover:text-teal-700">{t("Sozlamalar")}</Link>
          <Link href="/profile" className="text-slate-600 dark:text-slate-300 hover:text-teal-700">{t("Profil")}</Link>
        </nav>
      </div>
      <div className="border-t border-slate-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-lg md:max-w-3xl lg:max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 text-[11px] text-slate-400">
          <span className="font-semibold text-red-600 dark:text-red-400">{t("NeuraMed tashxis qoʻymaydi va dori buyurmaydi. Shoshilinch holatda — 103.")}</span>
          <span className="sm:ml-auto">© {year} NeuraMed · Toshkent AI Hackathon</span>
        </div>
      </div>
    </footer>
  );
}

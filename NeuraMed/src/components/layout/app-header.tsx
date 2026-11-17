"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, ChevronDown, User, Settings, LogOut, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useSetLocale, useT } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { UserRole } from "@/types";
import { BrandLogo } from "./brand-logo";
import { NotificationBell } from "./notification-bell";
import { SosButton } from "./sos-button";

const LANGS: { value: Locale; label: string }[] = [
  { value: "uz", label: "O'zbek" }, { value: "ru", label: "Русский" }, { value: "en", label: "English" },
  { value: "kk", label: "Қазақша" }, { value: "ky", label: "Кыргызча" }, { value: "tg", label: "Тоҷикӣ" },
];

/** Umumiy header: logo, til, mavzu, 🔔 bildirishnomalar, profil; telefonda SOS. */
export function AppHeader({ name, role, contactPhone }: { name: string; role: UserRole; contactPhone?: string | null }) {
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md safe-top">
      <div className="mx-auto flex h-16 max-w-lg md:max-w-3xl lg:max-w-5xl items-center gap-2 px-4">
        <Link href={role === "doctor" ? "/doctor" : "/dashboard"} className="lg:hidden" aria-label={t("Bosh sahifa")}><BrandLogo size={34} /></Link>
        <span className={cn("hidden sm:inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold", role === "doctor" ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300" : "bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300")}>
          {role === "doctor" ? t("Shifokor") : t("Bemor")}
        </span>
        <div className="flex-1" />
        {role === "patient" && <SosButton compact contactPhone={contactPhone} className="lg:hidden" />}
        <label className="relative hidden sm:inline-flex items-center">
          <Globe className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-400" />
          <select aria-label={t("Til")} value={locale} onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-10 appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent pl-8 pr-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            {LANGS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? t("Yorugʻ rejim") : t("Tungi rejim")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <NotificationBell />
        <ProfileMenu name={name} role={role} />
      </div>
    </header>
  );
}

function ProfileMenu({ name, role }: { name: string; role: UserRole }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const logout = async () => {
    await fetch("/api/auth?action=logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  };
  const initials = (name || "?").split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={t("Profil")}
        className="flex items-center gap-2 rounded-xl p-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-xs font-bold text-white">{initials}</span>
        <span className="hidden md:block max-w-[140px] truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{t(name)}</span>
        <ChevronDown className="hidden md:block h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[60] w-56 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 shadow-xl">
          <div className="px-4 py-2.5">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{t(name)}</p>
            <p className="text-xs text-slate-500">{role === "doctor" ? t("Shifokor") : t("Bemor")}</p>
          </div>
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"><User className="h-4 w-4" />{t("Profil")}</Link>
          <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"><Settings className="h-4 w-4" />{t("Sozlamalar")}</Link>
          <button type="button" onClick={logout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><LogOut className="h-4 w-4" />{t("Chiqish")}</button>
        </div>
      )}
    </div>
  );
}

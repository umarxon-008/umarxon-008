"use client";

import { useT, useLocale, useSetLocale } from "@/i18n/client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Bell, Globe, Info, Shield } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";

const languages: { value: Locale; label: string; flag: string }[] = [
  { value: "uz", label: "O'zbek", flag: "🇺🇿" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "kk", label: "Қазақша", flag: "🇰🇿" },
  { value: "ky", label: "Кыргызча", flag: "🇰🇬" },
  { value: "tg", label: "Тоҷикӣ", flag: "🇹🇯" },
];

const themes = [
  { value: "light", label: "Yorug'", icon: Sun },
  { value: "dark", label: "Qorong'i", icon: Moon },
  { value: "system", label: "Tizim", icon: Monitor },
];

export default function SettingsPage() {
  const t = useT();
  const { theme: rawTheme, setTheme } = useTheme();
  // Mavzu faqat brauzerda maʼlum — server HTML bilan mos kelishi uchun yuklangandan keyin koʻrsatiladi.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const theme = mounted ? rawTheme : undefined;
  const locale = useLocale();
  const setLocale = useSetLocale();
  const { permission, loading, enable } = usePushNotifications();

  return (
    <>
      <TopBar title={t("Sozlamalar")} />
      <div className="px-4 py-5 space-y-5">

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              {t("Ko'rinish")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((it) => (
                <button
                  key={it.value}
                  onClick={() => setTheme(it.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                    theme === it.value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-transparent bg-slate-50 dark:bg-slate-700/50"
                  )}
                >
                  <it.icon className={cn("h-5 w-5", theme === it.value ? "text-primary-500" : "text-slate-400")} />
                  <span className={cn("text-xs font-medium", theme === it.value ? "text-primary-600 dark:text-primary-400" : "text-slate-500 dark:text-slate-300")}>
                    {t(it.label)}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              {t("Til")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {languages.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLocale(l.value)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                    locale === l.value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-transparent bg-slate-50 dark:bg-slate-700/50"
                  )}
                >
                  <span className="text-xl">{l.flag}</span>
                  <span className={cn("text-sm font-medium", locale === l.value ? "text-primary-600 dark:text-primary-400" : "text-slate-700 dark:text-slate-200")}>
                    {l.label}
                  </span>
                  {locale === l.value && (
                    <span className="ml-auto text-xs text-primary-500 font-semibold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary-500" />
              {t("Bildirishnomalar")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t("Push bildirishnomalar")}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {permission === "granted"
                    ? t("✅ Yoqilgan")
                    : permission === "denied"
                    ? t("❌ Brauzer tomonidan bloklangan")
                    : t("Hali yoqilmagan")}
                </p>
              </div>
              {permission !== "granted" && permission !== "denied" && (
                <Button size="sm" onClick={enable} loading={loading}>
                  {t("Yoqish")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              {t("Maxfiylik")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              {t("Sizning tibbiy ma'lumotlaringiz AES-256-GCM algoritmi bilan shifrlangan holda saqlanadi. Hech kim sizning ma'lumotingizni o'qiy olmaydi.")}
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-green-500">✓</span> {t("Shifrlangan saqlash")}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-green-500">✓</span> {t("AI ga anonimlashtirish")}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-green-500">✓</span> {t("Ma'lumotni o'chirish huquqi")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-400" />
              {t("Ilova haqida")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t("Versiya")}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t("Ma'lumot manbasi")}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{t("DailyMed + openFDA")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">{t("AI model")}</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{t("GPT-4o-mini")}</span>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {t("⚠️ NeuraMed tibbiy maslahat bermaydi. Shifokor ko'rsatmasiz dori ichmang.")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

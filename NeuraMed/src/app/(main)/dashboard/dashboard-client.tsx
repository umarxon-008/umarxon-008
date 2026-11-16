"use client";

import { useT, useLocale } from "@/i18n/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search,
  Upload,
  Stethoscope,
  Bell,
  ChevronRight,
  Clock,
  AlertTriangle,
  Scan,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { formatDate, getTimeLabel, foodRuleLabel } from "@/lib/utils";
import type { ReminderWithMed } from "@/types";
import { registerServiceWorker } from "@/hooks/use-push-notifications";
import { PlatformOverview, type PlatformSummary } from "@/components/modules/platform-overview";

interface Props {
  userName: string;
  reminders: ReminderWithMed[];
  platform: PlatformSummary;
  recentReports: {
    id: string;
    fileName: string;
    hasUrgentValues: boolean;
    createdAt: string;
  }[];
}

export function DashboardClient({ userName, reminders, recentReports, platform }: Props) {
  const locale = useLocale();
  const t = useT();
  // Vaqtga bog'liq qiymatlar faqat brauzerda hisoblanadi (server va brauzer HTML'i mos kelishi uchun).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    registerServiceWorker();
    setNow(new Date());
  }, []);

  // Find next reminder
  const nextReminder = !now ? undefined : reminders
    .filter((r) => r.status === "ACTIVE")
    .flatMap((r) =>
      r.schedule.map((s) => ({ ...s, reminder: r }))
    )
    .find((s) => {
      const [h, m] = s.time.split(":").map(Number);
      const at = new Date();
      at.setHours(h, m, 0, 0);
      return at > now;
    });

  const firstName = userName.split(" ")[0];

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Greeting */}
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {now ? t(getGreeting(now)) : t("Salom,")}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
          {firstName} 👋
        </h1>
      </div>

      {/* Disclaimer */}
      <Disclaimer compact />

      {/* NeuraMed modullari (MEDAI, PHARMA TRACE, MEDCONNECT, MEDSTOCK AI) */}
      <PlatformOverview s={platform} />

      {/* Quick actions */}
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 -mb-2">{t("Shaxsiy yordamchi")}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/medications/search">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                <Search className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("Dori qidirish")}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("Ma'lumot oling")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/lab-reports">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                <Upload className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("Tahlil yuklash")}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("Lab natijasi")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/imaging-reports">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Scan className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("Rentgen")}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("Hisobot")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/doctor-visit">
          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{t("Shifokorga")}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("Tayyorlanish")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Next reminder */}
      {nextReminder ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("Keyingi eslatma")}</h2>
            <Link href="/reminders" className="text-xs text-primary-500 font-medium">
              {t("Hammasini ko'rish")}
            </Link>
          </div>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex flex-col items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-primary-500" />
                <span className="text-[10px] text-primary-600 font-semibold mt-0.5">
                  {nextReminder.time}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                  {nextReminder.reminder.medicationName}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {nextReminder.reminder.dose} · {t(foodRuleLabel(nextReminder.reminder.foodRule))}
                </p>
              </div>
              <Bell className="h-4 w-4 text-slate-300 shrink-0" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-5 w-5 text-slate-300" />
            <div className="flex-1">
              <p className="text-sm text-slate-500">{t("Bugun eslatma yo'q")}</p>
            </div>
            <Link href="/reminders/add">
              <Button variant="outline" size="sm">{t("Qo'shish")}</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Active reminders today */}
      {reminders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("Faol eslatmalar")}
            </h2>
            <Link href="/reminders" className="text-xs text-primary-500 font-medium flex items-center gap-0.5">
              {t("Barchasi")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {reminders.slice(0, 3).map((r) => (
              <Link key={r.id} href={`/reminders/${r.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {r.medicationName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                        {r.medicationName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {r.dose} · {r.timesPerDay}{t("x kuniga")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {r.schedule.slice(0, 2).map((s, i) => (
                        <span key={i} className="block text-xs text-slate-500">
                          {s.time}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent reports */}
      {recentReports.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("So'nggi tahlillar")}
            </h2>
            <Link href="/lab-reports" className="text-xs text-primary-500 font-medium flex items-center gap-0.5">
              {t("Barchasi")} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentReports.map((r) => (
              <Link key={r.id} href={`/lab-reports/${r.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Upload className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                        {r.fileName}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(r.createdAt, locale)}</p>
                    </div>
                    {r.hasUrgentValues && (
                      <Badge variant="high" className="shrink-0">
                        <AlertTriangle className="h-3 w-3" />
                        {t("Urgent")}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Xayrli tong,";
  if (hour >= 12 && hour < 17) return "Xayrli kun,";
  if (hour >= 17 && hour < 21) return "Xayrli kech,";
  return "Yaxshi kechalar,";
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pill, FlaskConical, HeartPulse, CalendarDays, MessageSquare, ScanSearch, Clock, ShieldAlert, ChevronRight } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useFormat } from "@/components/modules/common";
import type { ReminderWithMed } from "@/types";
import { registerServiceWorker } from "@/hooks/use-push-notifications";
import type { PlatformSummary } from "@/components/modules/platform-overview";

interface Props {
  userName: string;
  reminders: ReminderWithMed[];
  platform: PlatformSummary;
  recentReports: { id: string; fileName: string; hasUrgentValues: boolean; createdAt: string }[];
}

const ACTIONS = [
  { href: "/medications", icon: Pill, label: "Dorilar" },
  { href: "/lab-reports", icon: FlaskConical, label: "Tahlillar" },
  { href: "/checkup", icon: HeartPulse, label: "Chekap" },
  { href: "/connect", icon: CalendarDays, label: "Shifokorga yozilish" },
  { href: "/assistant", icon: MessageSquare, label: "Savol berish" },
  { href: "/trace", icon: ScanSearch, label: "Dorini tekshirish" },
];

/** Bemorning bosh sahifasi: bugungi eng muhim narsalar va 6 ta katta tugma. */
export function DashboardClient({ userName, reminders, platform }: Props) {
  const t = useT();
  const fmt = useFormat();
  // Vaqtga bog'liq qiymatlar faqat brauzerda hisoblanadi (server va brauzer HTML'i mos kelishi uchun).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { registerServiceWorker(); setNow(new Date()); }, []);

  const nextDose = !now ? undefined : reminders
    .filter((r) => r.status === "ACTIVE")
    .flatMap((r) => r.schedule.map((s) => ({ ...s, reminder: r })))
    .filter((s) => { const [h, m] = s.time.split(":").map(Number); const at = new Date(); at.setHours(h, m, 0, 0); return at > now; })
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  const hour = now?.getHours() ?? 12;
  const greeting = hour >= 5 && hour < 12 ? "Xayrli tong" : hour < 17 ? "Xayrli kun" : hour < 21 ? "Xayrli kech" : "Yaxshi kechalar";
  const firstName = userName.split(" ")[0];
  const appt = platform.connect.upcoming;
  const suspicious = platform.trace.suspicious[0];
  const score = platform.health.score;

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{now ? t(greeting) : t("Salom")}, {firstName}</h1>

      <section className="card-base space-y-1">
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{t("Bugun")}</h2>

        <Link href={nextDose ? `/reminders/${nextDose.reminder.id}` : "/medications"} className="flex items-center gap-4 rounded-2xl p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><Clock className="h-7 w-7" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-base text-slate-600 dark:text-slate-300">{t("Keyingi dori")}</span>
            <span className="block text-lg font-bold text-slate-900 dark:text-white">
              {nextDose ? `${nextDose.time} — ${nextDose.reminder.medicationName} ${nextDose.reminder.dose}` : t("Bugun boshqa dori yoʻq")}
            </span>
          </span>
          <ChevronRight className="h-6 w-6 text-slate-400" />
        </Link>

        <Link href="/connect?tab=appointments" className="flex items-center gap-4 rounded-2xl p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><CalendarDays className="h-7 w-7" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-base text-slate-600 dark:text-slate-300">{t("Shifokor qabuli")}</span>
            <span className="block text-lg font-bold text-slate-900 dark:text-white">
              {appt ? `${fmt.day(appt.date)}, ${appt.time} — ${t(appt.doctor)}` : t("Qabul yoʻq")}
            </span>
          </span>
          <ChevronRight className="h-6 w-6 text-slate-400" />
        </Link>

        <Link href="/checkup" className="flex items-center gap-4 rounded-2xl p-3 hover:bg-slate-50 dark:hover:bg-slate-700/40">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><HeartPulse className="h-7 w-7" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-base text-slate-600 dark:text-slate-300">{t("Salomatlik balli")}</span>
            <span className={cn("block text-lg font-bold", score == null ? "text-slate-900 dark:text-white" : score >= 80 ? "text-emerald-700 dark:text-emerald-400" : score >= 60 ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400")}>
              {score != null ? `${score} / 100` : t("Chekap hali oʻtkazilmagan")}
            </span>
          </span>
          <ChevronRight className="h-6 w-6 text-slate-400" />
        </Link>

        {suspicious && (
          <Link href={`/trace/${suspicious.id}`} className="mt-1 flex items-center gap-4 rounded-2xl bg-red-50 p-3 dark:bg-red-900/20">
            <ShieldAlert className="h-7 w-7 shrink-0 text-red-600 dark:text-red-400" />
            <span className="flex-1 text-base font-semibold text-red-800 dark:text-red-200">{t("{name} dorisining partiyasi shubhali", { name: t(suspicious.name) })}</span>
            <ChevronRight className="h-6 w-6 text-red-400" />
          </Link>
        )}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="card-base flex min-h-[120px] flex-col items-center justify-center gap-3 text-center transition hover:border-primary-300 hover:shadow-card">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"><a.icon className="h-7 w-7" /></span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{t(a.label)}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}

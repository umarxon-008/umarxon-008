"use client";

import { useT } from "@/i18n/client";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclaimerProps {
  className?: string;
  compact?: boolean;
}

export function Disclaimer({ className, compact }: DisclaimerProps) {
  const t = useT();
  if (compact) {
    return (
      <p className={cn("text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1", className)}>
        <AlertTriangle className="h-3 w-3 shrink-0" />
        {t("Shifokor maslahati emas. Tibbiy qaror qabul qilishdan oldin shifokorga murojaat qiling.")}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <strong>{t("Muhim eslatma:")}</strong> {t("Bu umumiy ma'lumot bo'lib, tashxis yoki davolash bo'yicha shifokor maslahati emas. Har qanday tibbiy qaror qabul qilishdan oldin malakali shifokorga murojaat qiling.")}
      </p>
    </div>
  );
}

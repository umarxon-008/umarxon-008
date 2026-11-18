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
  // Sodda interfeys: qisqa variant ko'rsatilmaydi (asosiy eslatma footerda turadi).
  if (compact) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
        className
      )}
    >
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
        {t("Shifokor maslahati emas. Tibbiy qaror qabul qilishdan oldin shifokorga murojaat qiling.")}
      </p>
    </div>
  );
}

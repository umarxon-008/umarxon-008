import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclaimerProps {
  className?: string;
  compact?: boolean;
}

export function Disclaimer({ className, compact }: DisclaimerProps) {
  if (compact) {
    return (
      <p className={cn("text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1", className)}>
        <AlertTriangle className="h-3 w-3 shrink-0" />
        Shifokor maslahati emas. Tibbiy qaror qabul qilishdan oldin shifokorga murojaat qiling.
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
        <strong>Muhim eslatma:</strong> Bu umumiy ma&apos;lumot bo&apos;lib, tashxis yoki davolash
        bo&apos;yicha shifokor maslahati emas. Har qanday tibbiy qaror qabul qilishdan oldin
        malakali shifokorga murojaat qiling.
      </p>
    </div>
  );
}

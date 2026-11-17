"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

/** Sahifa ichidagi bo'limlar (yorliqlar) — birlashtirilgan sahifalar uchun umumiy ko'rinish. */
export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; icon?: React.ElementType; badge?: number }[] }) {
  const t = useT();
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-soft">
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={value === it.id} type="button" onClick={() => onChange(it.id)}
          className={cn("flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition", value === it.id ? "bg-gradient-primary text-white shadow" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800")}>
          {it.icon && <it.icon className="h-4 w-4" />}{t(it.label)}
          {!!it.badge && <span className={cn("rounded-full px-1.5 text-[10px]", value === it.id ? "bg-white/25" : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400")}>{it.badge}</span>}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";
import { BrandLogo } from "./brand-logo";
import { navFor, isActivePath } from "./nav-items";
import { SosButton } from "./sos-button";

/** Kompyuter va planshet (lg+) uchun yon menyu (rolga qarab). */
export function SideNav({ role, contactPhone }: { role: UserRole; contactPhone?: string | null }) {
  const t = useT();
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 flex-col gap-5 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-5 overflow-y-auto">
      <Link href={role === "doctor" ? "/doctor" : "/dashboard"} className="px-2"><BrandLogo size={44} withName /></Link>
      <nav className="flex flex-col gap-4" aria-label={t("Boʻlimlar")}>
        {navFor(role).map((g, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {g.title && <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t(g.title)}</p>}
            {g.items.map((it) => {
              const active = isActivePath(pathname, it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-gradient-to-r from-emerald-50 to-violet-50 dark:from-emerald-900/20 dark:to-violet-900/20 text-slate-900 dark:text-white font-semibold"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800"
                  )}
                >
                  {active && <span className="absolute -left-4 top-2 bottom-2 w-1 rounded-r bg-gradient-primary" />}
                  <it.icon className={cn("h-[18px] w-[18px]", active ? "text-teal-600 dark:text-teal-400" : "")} />
                  {t(it.label)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {role === "patient" && <SosButton contactPhone={contactPhone} className="mt-auto mx-1" />}
    </aside>
  );
}

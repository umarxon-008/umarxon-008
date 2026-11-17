"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { UserRole } from "@/types";
import { bottomFor, isActivePath } from "./nav-items";

export function BottomNav({ role }: { role: UserRole }) {
  const t = useT();
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-2">
        {bottomFor(role).map((item) => {
          const isActive = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive ? "text-primary-500" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary-500" : "text-slate-400")}>{t(item.label)}</span>
              {isActive && <span className="absolute bottom-0 h-0.5 w-8 bg-primary-500 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

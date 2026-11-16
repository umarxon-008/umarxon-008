import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";
import { TopBar } from "@/components/layout/top-bar";
import { BrandLogo } from "@/components/layout/brand-logo";
import { NAV_GROUPS } from "@/components/layout/nav-items";

export const metadata = { title: "Menyu" };

/** Telefon uchun barcha bo'limlar ro'yxati. */
export default function MorePage() {
  return (
    <>
      <TopBar title="Menyu" />
      <div className="px-4 py-4 space-y-5">
        <div className="card-base p-4"><BrandLogo size={48} withName /></div>
        {NAV_GROUPS.map((g, i) => (
          <section key={i}>
            {g.title && <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{g.title}</p>}
            <ul className="card-base divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-50 to-violet-50 dark:from-emerald-900/30 dark:to-violet-900/30 text-teal-700 dark:text-teal-300"><it.icon className="h-[18px] w-[18px]" /></span>
                    <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{it.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <LogoutButton />
      </div>
    </>
  );
}

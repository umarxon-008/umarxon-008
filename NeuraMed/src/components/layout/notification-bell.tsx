"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Pill, CalendarCheck, HeartPulse, Activity, MessageCircle, ShieldAlert, ClipboardList, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { useFormat } from "@/components/modules/common";

interface Notif { id: string; kind: string; text: string; vars?: Record<string, string | number>; href: string; at: string; unread: boolean }
const ICON: Record<string, React.ElementType> = { dose: Pill, appointment: CalendarCheck, checkup: HeartPulse, vitals: Activity, message: MessageCircle, trace: ShieldAlert, prep: ClipboardList };
const TONE: Record<string, string> = {
  dose: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  appointment: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  checkup: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  vitals: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  message: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  trace: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  prep: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

/** 🔔 Profil yonidagi umumiy bildirishnomalar. */
export function NotificationBell() {
  const t = useT();
  const fmt = useFormat();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Notif[]>([]);
  const [unread, setUnread] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(() => {
    fetch("/api/notifications/feed").then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) { setItems(d.items); setUnread(d.unread); } }).catch(() => {});
  }, []);
  React.useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, [load]);
  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close); window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, [open]);

  const readAll = async () => {
    await fetch("/api/notifications/feed", { method: "POST" }).catch(() => {});
    setItems((xs) => xs.map((x) => ({ ...x, unread: false }))); setUnread(0);
  };
  const time = (iso: string) => { const d = new Date(iso); return `${fmt.dayNoYear(iso)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen((v) => !v); if (!open) load(); }} aria-label={t("Bildirishnomalar")} aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label={t("Bildirishnomalar")} className="absolute right-0 top-12 z-[60] w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
            <p className="font-bold text-slate-900 dark:text-white">{t("Bildirishnomalar")}</p>
            {unread > 0 && <button type="button" onClick={readAll} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400"><CheckCheck className="h-4 w-4" />{t("Hammasini oʻqildi")}</button>}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {items.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">{t("Hozircha bildirishnoma yoʻq")}</li>}
            {items.map((n) => {
              const Icon = ICON[n.kind] || Bell;
              return (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className={cn("flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60", n.unread && "bg-teal-50/40 dark:bg-teal-900/10")}>
                    <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TONE[n.kind])}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm text-slate-700 dark:text-slate-200", n.unread && "font-semibold text-slate-900 dark:text-white")}>{t(n.text, Object.fromEntries(Object.entries(n.vars || {}).map(([k, v]) => [k, typeof v === "string" ? t(v) : v])))}</span>
                      <span className="block text-[11px] text-slate-400">{time(n.at)}</span>
                    </span>
                    {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { MessageSquare, ScanSearch, CalendarDays, Boxes, ArrowRight, AlertTriangle, ShieldAlert, CalendarCheck, Sparkles } from "lucide-react";
import { cn, uzDate } from "@/lib/utils";

export interface PlatformSummary {
  aiEnabled: boolean;
  trace: { total: number; verified: number; suspicious: { id: string; name: string }[] };
  stock: { total: number; low: number; expiring: number; expired: number; reorder: number };
  connect: { doctors: number; upcoming: { id: string; doctor: string; specialty: string; date: string; time: string } | null; upcomingCount: number };
  threads: number;
}


/** Bosh sahifadagi platforma bloki: modullar va muhim ogohlantirishlar. */
export function PlatformOverview({ s }: { s: PlatformSummary }) {
  const modules = [
    { href: "/assistant", icon: MessageSquare, name: "MEDAI", title: "AI yordamchi va kutubxona", stat: s.threads ? `${s.threads} ta suhbat` : "Savol bering", tag: s.aiEnabled ? "AI" : "Demo", grad: "from-emerald-500 to-teal-500" },
    { href: "/trace", icon: ScanSearch, name: "PHARMA TRACE", title: "Dori kelib chiqishini tekshirish", stat: `${s.trace.verified}/${s.trace.total} tasdiqlangan`, tag: "Demo", grad: "from-teal-500 to-cyan-600" },
    { href: "/connect", icon: CalendarDays, name: "MEDCONNECT", title: "Shifokor va qabul", stat: s.connect.upcomingCount ? `${s.connect.upcomingCount} ta qabul` : `${s.connect.doctors} ta shifokor`, tag: "Demo", grad: "from-cyan-600 to-violet-600" },
    { href: "/stock", icon: Boxes, name: "MEDSTOCK AI", title: "Dorixona zaxirasi", stat: `${s.stock.low + s.stock.expired} ta diqqat talab`, tag: "Demo", grad: "from-violet-600 to-purple-700" },
  ];
  const alerts = [
    s.trace.suspicious.length && { href: `/trace/${s.trace.suspicious[0].id}`, icon: ShieldAlert, tone: "red", text: `PHARMA TRACE: ${s.trace.suspicious.map((p) => p.name).join(", ")} partiyasi shubhali deb belgilangan` },
    s.stock.low + s.stock.expired > 0 && { href: "/stock", icon: AlertTriangle, tone: "amber", text: `MEDSTOCK: ${s.stock.low} ta dori kam qolgan, ${s.stock.expired} tasining muddati oʻtgan · ${s.stock.reorder} ta buyurtma tavsiyasi` },
    s.connect.upcoming && { href: "/connect?tab=appointments", icon: CalendarCheck, tone: "teal", text: `MEDCONNECT: ${uzDate(s.connect.upcoming.date, { year: false })}, ${s.connect.upcoming.time} — ${s.connect.upcoming.doctor} (${s.connect.upcoming.specialty})` },
  ].filter(Boolean) as { href: string; icon: React.ElementType; tone: string; text: string }[];
  const toneCls: Record<string, string> = {
    red: "bg-red-50 text-red-800 border-red-100 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900",
    amber: "bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-900",
    teal: "bg-teal-50 text-teal-800 border-teal-100 dark:bg-teal-900/20 dark:text-teal-200 dark:border-teal-900",
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300"><Sparkles className="h-4 w-4 text-teal-500" /> NeuraMed modullari</h2>
        <span className="text-[11px] text-slate-400">Demo maʼlumotlar bilan</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {modules.map((m) => (
          <Link key={m.href} href={m.href} className="group card-base relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-card">
            <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow", m.grad)}><m.icon className="h-5 w-5" /></span>
            <span className={cn("absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold", m.tag === "AI" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>{m.tag}</span>
            <p className="mt-3 text-[11px] font-bold tracking-wider text-teal-700 dark:text-teal-400">{m.name}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-white leading-snug">{m.title}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">{m.stat}<ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></p>
          </Link>
        ))}
      </div>
      {alerts.length > 0 && (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className={cn("flex items-center gap-3 rounded-2xl border p-3 text-sm", toneCls[a.tone])}>
                <a.icon className="h-4 w-4 shrink-0" /><span className="flex-1">{a.text}</span><ArrowRight className="h-4 w-4 shrink-0 opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

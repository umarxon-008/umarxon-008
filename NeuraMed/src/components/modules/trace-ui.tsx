import { ShieldCheck, ShieldAlert, Clock3, Factory, Warehouse, Truck, Store, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const STATUS = {
  verified: { label: "Tasdiqlangan", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", icon: ShieldCheck },
  pending: { label: "Tekshirilmoqda", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock3 },
  suspicious: { label: "Shubhali", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", icon: ShieldAlert },
} as const;

export function TraceStatusBadge({ status, className }: { status: keyof typeof STATUS; className?: string }) {
  const s = STATUS[status];
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold", s.cls, className)}><s.icon className="h-3.5 w-3.5" />{s.label}</span>;
}

export const STAGE_ICON: Record<string, React.ElementType> = { manufacturer: Factory, warehouse: Warehouse, distributor: Truck, pharmacy: Store };
export const STATE_STYLE: Record<string, { dot: string; label: string }> = {
  done: { dot: "bg-emerald-500 text-white", label: "Bajarildi" },
  current: { dot: "bg-teal-500 text-white ring-4 ring-teal-100 dark:ring-teal-900", label: "Joriy bosqich" },
  pending: { dot: "bg-slate-200 text-slate-500 dark:bg-slate-700", label: "Kutilmoqda" },
  issue: { dot: "bg-red-500 text-white ring-4 ring-red-100 dark:ring-red-900", label: "Muammo" },
};
export const IssueIcon = AlertTriangle;

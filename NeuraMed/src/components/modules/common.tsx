"use client";

import * as React from "react";
import { FlaskConical, PhoneCall, X } from "lucide-react";
import { cn, uzDate } from "@/lib/utils";

/** API so'rovi: xatolikda server xabarini Error sifatida qaytaradi. */
export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init || {};
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers || {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== "undefined") window.location.href = "/login";
  if (!res.ok) throw new Error(data?.error || data?.message || "Soʻrov bajarilmadi");
  return data as T;
}

/** "DEMO" belgisi: namunaviy ma'lumot ekanini doim ko'rsatadi. */
export function DemoBadge({ children = "DEMO", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300", className)}>
      <FlaskConical className="h-3 w-3" />
      {children}
    </span>
  );
}

export function DemoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("demo-note", className)}>
      <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  );
}

/** Modul sarlavhasi (gradient fon, ikona, tavsif). */
export function ModuleHero({ icon: Icon, name, title, text, right }: { icon: React.ElementType; name: string; title: string; text: string; right?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-brand-deep p-5 text-white shadow-card">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl" />
      <div className="absolute -bottom-12 right-20 h-32 w-32 rounded-full bg-violet-500/30 blur-2xl" />
      <div className="relative flex items-start gap-4">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
          <Icon className="h-6 w-6" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">{name}</p>
          <h2 className="mt-0.5 text-lg font-extrabold leading-snug">{title}</h2>
          <p className="mt-1 text-sm text-white/75 leading-relaxed">{text}</p>
        </div>
        {right}
      </div>
    </section>
  );
}

export function Kpi({ label, value, hint, tone = "slate", icon: Icon }: { label: string; value: React.ReactNode; hint?: string; tone?: "slate" | "green" | "amber" | "red" | "violet" | "teal"; icon?: React.ElementType }) {
  const tones: Record<string, string> = {
    slate: "text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-200",
    green: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300",
    amber: "text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300",
    red: "text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300",
    violet: "text-violet-700 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-300",
    teal: "text-teal-700 bg-teal-50 dark:bg-teal-900/30 dark:text-teal-300",
  };
  return (
    <div className="card-base p-4 flex items-start gap-3">
      {Icon && <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}><Icon className="h-5 w-5" /></span>}
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-xl font-extrabold text-slate-900 dark:text-white leading-tight">{value}</p>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export function EmergencyBanner({ className }: { className?: string }) {
  return (
    <div role="alert" className={cn("flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-3.5", className)}>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white"><PhoneCall className="h-4 w-4" /></span>
      <div className="text-sm text-red-800 dark:text-red-200">
        <p className="font-bold">Shoshilinch holat belgilari boʻlishi mumkin</p>
        <p className="mt-0.5 text-xs leading-relaxed">Hayot uchun xavfli belgilar boʻlsa, kutmang — darhol <a href="tel:103" className="font-bold underline">103</a> (tez yordam) yoki <a href="tel:112" className="font-bold underline">112</a> ga qoʻngʻiroq qiling.</p>
      </div>
    </div>
  );
}

/** Oddiy modal oyna. */
export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("w-full max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Yopish"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active ? "border-transparent bg-gradient-primary text-white shadow" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-teal-400",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Toast({ text, onDone }: { text: string | null; onDone: () => void }) {
  React.useEffect(() => {
    if (!text) return;
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [text, onDone]);
  if (!text) return null;
  return <div role="status" className="fixed bottom-24 lg:bottom-8 left-1/2 z-[70] -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-xl">{text}</div>;
}

export const formatDay = (d: string | Date | null | undefined) => (d ? uzDate(d, { short: true }) : "—");
export const formatSum = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} soʻm`;
const WEEK = ["Yak", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
export const weekday = (iso: string) => WEEK[new Date(`${iso.slice(0, 10)}T12:00:00Z`).getUTCDay()];

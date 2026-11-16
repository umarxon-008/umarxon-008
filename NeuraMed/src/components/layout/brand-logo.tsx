"use client";

import { useT } from "@/i18n/client";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** NeuraMed logotipi (tabletkali, public/brand/). */
export function BrandLogo({ size = 36, className, withName = false, light = false }: { size?: number; className?: string; withName?: boolean; light?: boolean }) {
  const t = useT();
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="inline-flex shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5" style={{ width: size, height: size }}>
        <Image src={size > 128 ? "/brand/neuramed-logo-512.png" : "/brand/neuramed-logo-256.png"} alt={t("NeuraMed logotipi")} width={size} height={size} priority />
      </span>
      {withName && (
        <span className="flex flex-col leading-tight">
          <span className={cn("font-extrabold tracking-wide", light ? "text-white" : "gradient-text")}>{t("NeuraMed")}</span>
          <span className={cn("text-[11px]", light ? "text-white/70" : "text-slate-500")}>{t("Yagona tibbiy platforma")}</span>
        </span>
      )}
    </span>
  );
}

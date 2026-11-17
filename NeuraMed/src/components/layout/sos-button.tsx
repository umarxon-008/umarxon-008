"use client";

import * as React from "react";
import { Phone, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

/**
 * Qizil SOS tugmasi. Bosilganda faqat ikki narsa: 103 ga qo'ng'iroq va joylashuvni yaqin odamga yuborish.
 * contactPhone — profildagi yaqin odam raqami (ulashish oynasi bo'lmagan qurilmada SMS shu raqamga ochiladi).
 */
export function SosButton({ contactPhone, className, compact }: { contactPhone?: string | null; className?: string; compact?: boolean }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [state, setState] = React.useState<"idle" | "locating" | "sent" | "error">("idle");

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sendLocation = () => {
    if (!navigator.geolocation) { setState("error"); return; }
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const link = `https://maps.google.com/?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
        const text = `${t("Menga yordam kerak. Mening joylashuvim:")} ${link}`;
        try {
          if (navigator.share) await navigator.share({ text });
          else window.location.href = `sms:${(contactPhone || "").replace(/[^\d+]/g, "")}?body=${encodeURIComponent(text)}`;
          setState("sent");
        } catch { setState("idle"); }
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <>
      <button type="button" onClick={() => { setState("idle"); setOpen(true); }} aria-haspopup="dialog"
        className={cn("inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 font-black tracking-wider text-white shadow hover:bg-red-700", compact ? "rounded-full px-3 py-1.5 text-xs" : "py-2.5 text-sm", className)}>
        {compact ? "SOS" : "SOS · 103"}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="SOS" className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black tracking-wider text-red-600">SOS</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={t("Yopish")}><X className="h-5 w-5" /></button>
            </div>
            <a href="tel:103" className="flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-4 py-5 text-base sm:text-lg font-extrabold text-white shadow hover:bg-red-700">
              <Phone className="h-6 w-6 shrink-0" />{t("103 ga qoʻngʻiroq qilish")}
            </a>
            <button type="button" onClick={sendLocation} disabled={state === "locating"}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-red-200 dark:border-red-900 px-4 py-5 text-base sm:text-lg font-extrabold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60">
              <MapPin className="h-6 w-6 shrink-0" /><span className="text-left">{state === "locating" ? t("Joylashuv aniqlanmoqda…") : t("Joylashuvni yaqiningizga yuborish")}</span>
            </button>
            {state === "sent" && <p className="text-center text-sm text-emerald-700 dark:text-emerald-400">{t("Joylashuv yuborishga tayyorlandi.")}</p>}
            {state === "error" && <p role="alert" className="text-center text-sm text-red-700 dark:text-red-400">{t("Joylashuvni aniqlab boʻlmadi. Darhol 103 ga qoʻngʻiroq qiling.")}</p>}
          </div>
        </div>
      )}
    </>
  );
}

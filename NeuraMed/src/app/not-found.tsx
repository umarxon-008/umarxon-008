"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useT();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-4 text-center bg-background">
      <div className="text-6xl font-black text-primary-500">404</div>
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">{t("Sahifa topilmadi")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("Siz qidirgan sahifa mavjud emas")}</p>
      </div>
      <Link href="/dashboard">
        <Button variant="gradient">{t("Bosh sahifaga qaytish")}</Button>
      </Link>
    </div>
  );
}

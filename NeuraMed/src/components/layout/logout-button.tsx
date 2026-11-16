"use client";

import { useT } from "@/i18n/client";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const t = useT();
  const logout = async () => {
    await fetch("/api/auth?action=logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  };
  return (
    <button type="button" onClick={logout} className="card-base flex w-full items-center gap-3 px-4 py-3.5 text-sm font-medium text-red-600">
      <LogOut className="h-[18px] w-[18px]" /> {t("Chiqish")}
    </button>
  );
}

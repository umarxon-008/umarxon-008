"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import { useState } from "react";
import { Bell, Plus, Clock, ChevronRight, Pause, Play, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { foodRuleLabel, formatDate } from "@/lib/utils";
import type { ReminderWithMed } from "@/types";
import { useRouter } from "next/navigation";

interface Props {
  reminders: ReminderWithMed[];
}

export function RemindersClient({ reminders: initial }: Props) {
  const t = useT();
  const [reminders, setReminders] = useState(initial);
  const router = useRouter();

  const handleStatusChange = async (id: string, status: "ACTIVE" | "PAUSED" | "CANCELLED") => {
    await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (status === "CANCELLED") {
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } else {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    }
  };

  const active = reminders.filter((r) => r.status === "ACTIVE");
  const paused = reminders.filter((r) => r.status === "PAUSED");

  if (reminders.length === 0) {
    return (
      <div className="px-4 py-12 text-center space-y-4">
        <div className="h-20 w-20 rounded-3xl bg-primary-50 dark:bg-primary-900/30 mx-auto flex items-center justify-center">
          <Bell className="h-10 w-10 text-primary-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t("Hozircha eslatma yo'q")}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {t("Dori eslatmasi qo'shing, vaqtida ichishni unutmang")}
          </p>
        </div>
        <Link href="/reminders/add">
          <Button variant="gradient" className="mt-2">
            <Plus className="h-4 w-4" />
            {t("Eslatma qo'shish")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {active.length} {t("ta faol eslatma")}
        </p>
        <Link href="/reminders/add">
          <Button size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5" />
            {t("Qo'shish")}
          </Button>
        </Link>
      </div>

      {active.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{t("Faol")}</p>
          <div className="space-y-3">
            {active.map((r) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onPause={() => handleStatusChange(r.id, "PAUSED")}
                onDelete={() => handleStatusChange(r.id, "CANCELLED")}
              />
            ))}
          </div>
        </div>
      )}

      {paused.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{t("To'xtatilgan")}</p>
          <div className="space-y-3">
            {paused.map((r) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                isPaused
                onResume={() => handleStatusChange(r.id, "ACTIVE")}
                onDelete={() => handleStatusChange(r.id, "CANCELLED")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReminderCard({
  reminder: r,
  isPaused,
  onPause,
  onResume,
  onDelete,
}: {
  reminder: ReminderWithMed;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const [showActions, setShowActions] = useState(false);

  return (
    <Card className={isPaused ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
              isPaused
                ? "bg-slate-100 dark:bg-slate-700"
                : "bg-gradient-to-br from-primary-500 to-violet-500"
            }`}
          >
            <span className={`font-bold text-sm ${isPaused ? "text-slate-400" : "text-white"}`}>
              {r.medicationName.slice(0, 2).toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                {r.medicationName}
              </p>
              {isPaused && <Badge variant="outline" className="text-[10px]">{t("To'xtatilgan")}</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {r.dose} · {t(foodRuleLabel(r.foodRule))}
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {r.schedule.map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                >
                  <Clock className="h-2.5 w-2.5" />
                  {s.time}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowActions((v) => !v)}
            className="text-slate-300 hover:text-slate-500 p-1 shrink-0"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showActions ? "rotate-90" : ""}`} />
          </button>
        </div>

        {showActions && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <Link href={`/reminders/${r.id}`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">{t("Batafsil")}</Button>
            </Link>
            {isPaused ? (
              <Button variant="outline" size="sm" onClick={onResume} className="flex-1">
                <Play className="h-3.5 w-3.5" />
                {t("Davom")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onPause} className="flex-1">
                <Pause className="h-3.5 w-3.5" />
                {t("To'xtat")}
              </Button>
            )}
            <Button variant="destructive" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

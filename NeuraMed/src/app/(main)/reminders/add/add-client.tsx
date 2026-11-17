"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Bell, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTimeLabel } from "@/lib/utils";
import type { ReminderSchedule } from "@/types";

interface Props {
  defaultMedName?: string;
  defaultMedId?: string;
}

const foodOptions = [
  { value: "ovqat_bilan", label: "🍽️ Ovqat bilan", desc: "Ovqatdan so'ng yoki ovqat bilan" },
  { value: "bosh_qorin", label: "⏰ Bo'sh qorin", desc: "Ovqatdan 30 min oldin" },
  { value: "ahamiyatsiz", label: "✅ Muhim emas", desc: "Istalgan vaqtda" },
];

const notifOptions = [
  { value: "push", label: "🔔 Push bildirishnoma" },
  { value: "alarm", label: "⏰ Budilnik" },
  { value: "both", label: "🔔⏰ Ikkalasi ham" },
];

export function AddReminderClient({ defaultMedName, defaultMedId }: Props) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    medicationName: defaultMedName || "",
    medicationId: defaultMedId || "",
    dose: "",
    timesPerDay: 1,
    foodRule: "ahamiyatsiz" as "ovqat_bilan" | "bosh_qorin" | "ahamiyatsiz",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notificationType: "push" as "push" | "alarm" | "both",
    notes: "",
  });

  const [times, setTimes] = useState<string[]>(["08:00"]);

  const updateTimesCount = (count: number) => {
    const newTimes = [...times];
    while (newTimes.length < count) newTimes.push("08:00");
    while (newTimes.length > count) newTimes.pop();
    setTimes(newTimes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.medicationName.trim()) {
      setError(t("Dori nomini kiriting"));
      return;
    }
    if (!form.dose.trim()) {
      setError(t("Dozani kiriting"));
      return;
    }

    const schedule: ReminderSchedule[] = times.map((time) => ({
      time,
      label: t(getTimeLabel(time)),
    }));

    setLoading(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: form.medicationId || undefined,
          medicationName: form.medicationName,
          dose: form.dose,
          timesPerDay: form.timesPerDay,
          schedule,
          foodRule: form.foodRule,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          notificationType: form.notificationType,
          notes: form.notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Xatolik yuz berdi");
      }

      router.push("/medications");
    } catch (err) {
      setError(t(err instanceof Error ? err.message : "Xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5">
      {/* Medication info */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            label={t("Dori nomi *")}
            value={form.medicationName}
            onChange={(e) => setForm((p) => ({ ...p, medicationName: e.target.value }))}
            placeholder={t("Masalan: Paracetamol")}
          />
          <Input
            label={t("Doza *")}
            value={form.dose}
            onChange={(e) => setForm((p) => ({ ...p, dose: e.target.value }))}
            placeholder={t("Masalan: 500 mg")}
          />
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("Kuniga necha marta")}
            </p>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => {
                  const n = Math.max(1, form.timesPerDay - 1);
                  setForm((p) => ({ ...p, timesPerDay: n }));
                  updateTimesCount(n);
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-bold text-slate-800 dark:text-white w-8 text-center">
                {form.timesPerDay}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => {
                  const n = Math.min(12, form.timesPerDay + 1);
                  setForm((p) => ({ ...p, timesPerDay: n }));
                  updateTimesCount(n);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t("Vaqtlar")}
            </p>
            <div className="space-y-2">
              {times.map((it, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                      type="time"
                      value={it}
                      onChange={(e) => {
                        const newTimes = [...times];
                        newTimes[i] = e.target.value;
                        setTimes(newTimes);
                      }}
                      className="input-base flex-1"
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-16 shrink-0">
                    {t(getTimeLabel(it))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Food rule */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            {t("Ovqat bilan yoki bo'sh qorin")}
          </p>
          <div className="space-y-2">
            {foodOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, foodRule: opt.value as typeof form.foodRule }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  form.foodRule === opt.value
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-transparent bg-slate-50 dark:bg-slate-700/50 hover:border-slate-200"
                }`}
              >
                <span className="text-base">{opt.label.split(" ")[0]}</span>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t(opt.label.split(" ").slice(1).join(" "))}
                  </p>
                  <p className="text-xs text-slate-400">{t(opt.desc)}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Input
            label={t("Boshlash sanasi")}
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
          />
          <Input
            label={t("Tugash sanasi (ixtiyoriy)")}
            type="date"
            value={form.endDate}
            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
          />
        </CardContent>
      </Card>

      {/* Notification type */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            {t("Eslatma turi")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {notifOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, notificationType: opt.value as typeof form.notificationType }))}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  form.notificationType === opt.value
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-transparent bg-slate-50 dark:bg-slate-700/50"
                }`}
              >
                <div className="text-lg mb-1">{opt.label.split(" ")[0]}</div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {t(opt.label.split(" ").slice(1).join(" "))}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <div>
        <label className="label-base">{t("Izoh (ixtiyoriy)")}</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          placeholder={t("Qo'shimcha eslatmalar...")}
          rows={2}
          className="input-base resize-none"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <Button type="submit" variant="gradient" size="xl" className="w-full" loading={loading}>
        <Bell className="h-5 w-5" />
        {t("Eslatma saqlash")}
      </Button>
    </form>
  );
}

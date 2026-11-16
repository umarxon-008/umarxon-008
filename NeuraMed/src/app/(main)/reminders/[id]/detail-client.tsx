"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, CheckCircle2, XCircle, AlarmClock,
  Bell, Trash2, Pause, Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { foodRuleLabel, formatDate } from "@/lib/utils";
import type { ReminderWithMed, DoseLogEntry } from "@/types";

interface Props {
  reminder: ReminderWithMed;
  logs: DoseLogEntry[];
}

const statusIcons = {
  TAKEN: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  SKIPPED: <XCircle className="h-4 w-4 text-red-400" />,
  POSTPONED: <AlarmClock className="h-4 w-4 text-amber-400" />,
};
const statusLabels = { TAKEN: "Qabul qilindi", SKIPPED: "O'tkazib yuborildi", POSTPONED: "Keyinga qoldirildi" };

export function ReminderDetailClient({ reminder: initial, logs: initialLogs }: Props) {
  const router = useRouter();
  const [reminder, setReminder] = useState(initial);
  const [logs, setLogs] = useState(initialLogs);
  const [loading, setLoading] = useState(false);

  const patch = async (body: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } finally {
      setLoading(false);
    }
  };

  const logDose = async (status: "TAKEN" | "SKIPPED" | "POSTPONED") => {
    const ok = await patch({
      action: "log",
      scheduledAt: new Date().toISOString(),
      status,
    });
    if (ok) {
      const newLog: DoseLogEntry = {
        id: `temp-${Date.now()}`,
        reminderId: reminder.id,
        scheduledAt: new Date().toISOString(),
        status,
      };
      setLogs((p) => [newLog, ...p]);
    }
  };

  const togglePause = async () => {
    const newStatus = reminder.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const ok = await patch({ status: newStatus });
    if (ok) setReminder((p) => ({ ...p, status: newStatus }));
  };

  const handleDelete = async () => {
    setLoading(true);
    await fetch(`/api/reminders/${reminder.id}`, { method: "DELETE" });
    router.push("/reminders");
  };

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Header card */}
      <Card className="bg-gradient-to-br from-primary-500 to-violet-500 border-0">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-black">
                {reminder.medicationName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">{reminder.medicationName}</h2>
              <p className="text-sm text-white/80 mt-0.5">{reminder.dose}</p>
              <div className="flex gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  {reminder.timesPerDay}x kuniga
                </Badge>
                <Badge className="bg-white/20 text-white border-0 text-xs">
                  {foodRuleLabel(reminder.foodRule)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Times */}
          <div className="mt-4 flex flex-wrap gap-2">
            {reminder.schedule.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                <Clock className="h-3.5 w-3.5 text-white/70" />
                <span className="text-sm font-semibold text-white">{s.time}</span>
                <span className="text-xs text-white/60">{s.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick log actions */}
      {reminder.status === "ACTIVE" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bugungi doza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                className="flex-col h-16 gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                onClick={() => logDose("TAKEN")}
                loading={loading}
              >
                <CheckCircle2 className="h-5 w-5" />
                Qabul qildim
              </Button>
              <Button
                variant="secondary"
                className="flex-col h-16 gap-1 text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30"
                onClick={() => logDose("SKIPPED")}
                loading={loading}
              >
                <XCircle className="h-5 w-5" />
                O&apos;tkazib yubordim
              </Button>
              <Button
                variant="secondary"
                className="flex-col h-16 gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                onClick={() => logDose("POSTPONED")}
                loading={loading}
              >
                <AlarmClock className="h-5 w-5" />
                Keyinga
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <InfoRow label="Boshlash sanasi" value={formatDate(reminder.startDate)} />
          {reminder.endDate && (
            <InfoRow label="Tugash sanasi" value={formatDate(reminder.endDate)} />
          )}
          <InfoRow
            label="Bildirishnoma"
            value={
              reminder.notificationType === "push" ? "Push bildirishnoma" :
              reminder.notificationType === "alarm" ? "Budilnik" : "Ikkalasi"
            }
          />
          <InfoRow
            label="Holat"
            value={
              reminder.status === "ACTIVE" ? "Faol" :
              reminder.status === "PAUSED" ? "To'xtatilgan" :
              reminder.status === "COMPLETED" ? "Tugallangan" : "Bekor qilingan"
            }
          />
          {reminder.notes && <InfoRow label="Izoh" value={reminder.notes} />}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          onClick={togglePause}
          loading={loading}
        >
          {reminder.status === "ACTIVE" ? (
            <><Pause className="h-4 w-4" /> To&apos;xtatish</>
          ) : (
            <><Play className="h-4 w-4" /> Davom ettirish</>
          )}
        </Button>
        <Button variant="destructive" onClick={handleDelete} loading={loading}>
          <Trash2 className="h-4 w-4" /> O&apos;chirish
        </Button>
      </div>

      {/* History */}
      {logs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Tarix</p>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                {statusIcons[log.status]}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {statusLabels[log.status]}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(log.scheduledAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

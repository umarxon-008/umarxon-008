"use client";

import { useT, useLocale } from "@/i18n/client";
import { useState } from "react";
import {
  Stethoscope, Plus, AlertTriangle, MessageSquare,
  FileText, ChevronRight, Loader2, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { formatDate, urgencyColor } from "@/lib/utils";
import type { DoctorVisitAIResult } from "@/types";

interface PastPrep {
  id: string;
  symptoms: string[];
  urgencyLevel: string;
  createdAt: string;
}

export interface PrepAppointment { id: string; label: string }

/** Qabulga tayyorlanish (MEDCONNECT ichida): belgilar va savollar tanlangan qabulga bog'lanadi — shifokor uni qabuldan oldin ko'radi. */
export function DoctorVisitClient({ pastPreps, appointments = [] }: { pastPreps: PastPrep[]; appointments?: PrepAppointment[] }) {
  const [appointmentId, setAppointmentId] = useState<string>(appointments[0]?.id || "");
  const locale = useLocale();
  const t = useT();
  const [step, setStep] = useState<"form" | "result">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DoctorVisitAIResult | null>(null);

  const [form, setForm] = useState({
    symptoms: [""],
    duration: "",
    hasTemperature: false,
    temperatureValue: "",
    allergies: [""],
    currentMedications: [""],
    chronicConditions: [""],
    pregnancyNote: "",
  });

  const addItem = (field: "symptoms" | "allergies" | "currentMedications" | "chronicConditions") =>
    setForm((p) => ({ ...p, [field]: [...p[field], ""] }));

  const updateItem = (
    field: "symptoms" | "allergies" | "currentMedications" | "chronicConditions",
    i: number,
    val: string
  ) =>
    setForm((p) => {
      const arr = [...p[field]];
      arr[i] = val;
      return { ...p, [field]: arr };
    });

  const removeItem = (
    field: "symptoms" | "allergies" | "currentMedications" | "chronicConditions",
    i: number
  ) =>
    setForm((p) => ({
      ...p,
      [field]: p[field].filter((_, idx) => idx !== i),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = form.symptoms.filter(Boolean);
    if (!filled.length) { setError(t("Kamida bitta belgi kiriting")); return; }
    if (!form.duration) { setError(t("Belgilar qancha davom etayotganini kiriting")); return; }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/doctor-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: form.symptoms.filter(Boolean),
          duration: form.duration,
          hasTemperature: form.hasTemperature,
          temperatureValue: form.temperatureValue || undefined,
          allergies: form.allergies.filter(Boolean),
          currentMedications: form.currentMedications.filter(Boolean),
          chronicConditions: form.chronicConditions.filter(Boolean),
          pregnancyNote: form.pregnancyNote || undefined,
          appointmentId: appointmentId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
      setResult(data.data.aiResult);
      setStep("result");
    } catch (err) {
      setError(t(err instanceof Error ? err.message : "Xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  if (step === "result" && result) {
    return <ResultView result={result} onReset={() => { setStep("form"); setResult(null); }} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Disclaimer compact />

      <Card>
        <CardContent className="p-4 space-y-2">
          <label className="block">
            <span className="label-base">{t("Qaysi qabulga tayyorlanyapsiz?")}</span>
            <select className="input-base" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}>
              {appointments.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              <option value="">{t("Qabulga bogʻlamasdan")}</option>
            </select>
          </label>
          <p className="text-xs text-slate-500">{t("Tanlangan qabuldagi shifokor belgilaringiz va savollaringizni qabuldan oldin koʻradi.")}</p>
        </CardContent>
      </Card>

      {/* Symptoms */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary-500" />
            {t("Belgilaringiz *")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.symptoms.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="input-base flex-1"
                value={s}
                onChange={(e) => updateItem("symptoms", i, e.target.value)}
                placeholder={t("Masalan: bosh og'riq, harorat, yo'tal...")}
              />
              {form.symptoms.length > 1 && (
                <button type="button" onClick={() => removeItem("symptoms", i)}
                  className="text-red-400 hover:text-red-600 px-2">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem("symptoms")}
            className="text-xs text-primary-500 font-medium hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" /> {t("Belgi qo'shish")}
          </button>
        </CardContent>
      </Card>

      {/* Duration */}
      <Input
        label={t("Belgilar qancha davom etmoqda? *")}
        value={form.duration}
        onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
        placeholder={t("Masalan: 3 kun, 1 hafta...")}
      />

      {/* Temperature */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("Harorat bormi?")}
            </p>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, hasTemperature: !p.hasTemperature }))}
              className={`w-12 h-6 rounded-full transition-all ${form.hasTemperature ? "bg-primary-500" : "bg-slate-200 dark:bg-slate-600"}`}
            >
              <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${form.hasTemperature ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
          {form.hasTemperature && (
            <Input
              value={form.temperatureValue}
              onChange={(e) => setForm((p) => ({ ...p, temperatureValue: e.target.value }))}
              placeholder={t("Masalan: 38.5")}
              type="number"
              step="0.1"
            />
          )}
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("Allergiyalar")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.allergies.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input className="input-base flex-1" value={a}
                onChange={(e) => updateItem("allergies", i, e.target.value)}
                placeholder={t("Masalan: penitsillin...")} />
              {form.allergies.length > 1 && (
                <button type="button" onClick={() => removeItem("allergies", i)}
                  className="text-red-400 px-2">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem("allergies")}
            className="text-xs text-primary-500 font-medium hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" /> {t("Qo'shish")}
          </button>
        </CardContent>
      </Card>

      {/* Current meds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("Hozir qanday dorilar ichyapsiz?")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.currentMedications.map((m, i) => (
            <div key={i} className="flex gap-2">
              <input className="input-base flex-1" value={m}
                onChange={(e) => updateItem("currentMedications", i, e.target.value)}
                placeholder={t("Dori nomi va dozasi")} />
              {form.currentMedications.length > 1 && (
                <button type="button" onClick={() => removeItem("currentMedications", i)}
                  className="text-red-400 px-2">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem("currentMedications")}
            className="text-xs text-primary-500 font-medium hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" /> {t("Qo'shish")}
          </button>
        </CardContent>
      </Card>

      {/* Chronic conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("Surunkali kasalliklar")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {form.chronicConditions.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input className="input-base flex-1" value={c}
                onChange={(e) => updateItem("chronicConditions", i, e.target.value)}
                placeholder={t("Masalan: diabet, gipertoniya...")} />
              {form.chronicConditions.length > 1 && (
                <button type="button" onClick={() => removeItem("chronicConditions", i)}
                  className="text-red-400 px-2">✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => addItem("chronicConditions")}
            className="text-xs text-primary-500 font-medium hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" /> {t("Qo'shish")}
          </button>
        </CardContent>
      </Card>

      {/* Pregnancy note */}
      <Input
        label={t("Homiladorlik / emizish holati (ixtiyoriy)")}
        value={form.pregnancyNote}
        onChange={(e) => setForm((p) => ({ ...p, pregnancyNote: e.target.value }))}
        placeholder={t("Masalan: 2 oylik homilador")}
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <Button type="submit" variant="gradient" size="xl" className="w-full" loading={loading}>
        {loading ? (
          <><Loader2 className="h-5 w-5 animate-spin" /> {t("Tayyorlanmoqda...")}</>
        ) : (
          <><Stethoscope className="h-5 w-5" /> {t("Qabulga tayyorlanish")}</>
        )}
      </Button>

      {/* Past preps */}
      {pastPreps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            {t("O'tgan tayyorlovlar")}
          </p>
          <div className="space-y-2">
            {pastPreps.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                    {p.symptoms.slice(0, 2).join(", ")}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(p.createdAt, locale)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColor(p.urgencyLevel.toLowerCase())}`}>
                  {p.urgencyLevel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

function ResultView({ result, onReset }: { result: DoctorVisitAIResult; onReset: () => void }) {
  const t = useT();
  const isEmergency = result.urgency_level === "emergency";

  return (
    <div className="space-y-4">
      {/* Emergency alert */}
      {isEmergency && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-600 text-white">
          <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-base">{t("DARHOL tibbiy yordam so'rang!")}</p>
            <p className="text-sm text-red-100 mt-0.5">{result.urgency_note}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary-500" />
            {t("Vaziyat xulosasi")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{result.summary}</p>
          {!isEmergency && (
            <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${urgencyColor(result.urgency_level)}`}>
              {result.urgency_note}
            </div>
          )}
        </CardContent>
      </Card>

      <Disclaimer compact />

      {/* Symptoms list */}
      {result.symptoms_list?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("Belgilar ro'yxati")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.symptoms_list.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary-400 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Emergency signs */}
      {result.emergency_signs && result.emergency_signs.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t("Quyidagi belgilar bo'lsa darhol yordam so'rang")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.emergency_signs.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Questions for doctor */}
      {result.questions_for_doctor?.length > 0 && (
        <Card className="border-primary-100 dark:border-primary-900">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-primary-700 dark:text-primary-400">
              <MessageSquare className="h-4 w-4" />
              {t("Shifokorga savollar")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {result.questions_for_doctor.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-[10px] font-bold text-primary-700 dark:text-primary-400">
                    {i + 1}
                  </span>
                  {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Documents to bring */}
      {result.documents_to_bring?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              {t("Olib borish kerak bo'lgan hujjatlar")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {result.documents_to_bring.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <ChevronRight className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  {d}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Disclaimer />

      <Button variant="secondary" className="w-full" onClick={onReset}>
        {t("Yangi tayyorlov")}
      </Button>
    </div>
  );
}

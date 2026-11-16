"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Xush kelibsiz!", subtitle: "Bir necha savolga javob bering" },
  { id: 2, title: "Shaxsiy ma'lumot", subtitle: "Bu ma'lumot AI ga kontekst beradi" },
  { id: 3, title: "Sog'liq ma'lumoti", subtitle: "Allergiya va kasalliklaringiz" },
  { id: 4, title: "Tayyor!", subtitle: "NeuraMed sizga yordam berishga tayyor" },
];

const genderOptions = [
  { value: "MALE", label: "Erkak", icon: "👨" },
  { value: "FEMALE", label: "Ayol", icon: "👩" },
  { value: "OTHER", label: "Boshqa", icon: "🧑" },
  { value: "PREFER_NOT_TO_SAY", label: "Aytmayman", icon: "🤐" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    age: "",
    gender: "",
    heightCm: "",
    weightKg: "",
    allergies: [""],
    chronicConditions: [""],
  });

  const addItem = (field: "allergies" | "chronicConditions") => {
    setForm((p) => ({ ...p, [field]: [...p[field], ""] }));
  };

  const updateItem = (field: "allergies" | "chronicConditions", i: number, val: string) => {
    setForm((p) => {
      const arr = [...p[field]];
      arr[i] = val;
      return { ...p, [field]: arr };
    });
  };

  const removeItem = (field: "allergies" | "chronicConditions", i: number) => {
    setForm((p) => ({ ...p, [field]: p[field].filter((_, idx) => idx !== i) }));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: form.age ? parseInt(form.age) : undefined,
          gender: form.gender || undefined,
          heightCm: form.heightCm ? parseFloat(form.heightCm) : undefined,
          weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
          allergies: form.allergies.filter(Boolean),
          chronicConditions: form.chronicConditions.filter(Boolean),
        }),
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Progress */}
      <div className="flex gap-1.5 mb-6">
        {steps.map((s) => (
          <div
            key={s.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              s.id <= step ? "bg-primary-500" : "bg-slate-100 dark:bg-slate-700"
            )}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {steps[step - 1].title}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{steps[step - 1].subtitle}</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: "💊", title: "Dori ma'lumoti", desc: "Rasmiy manbadan" },
              { icon: "🧪", title: "Lab tahlili", desc: "AI tushuntiradi" },
              { icon: "🩺", title: "Shifokorga", desc: "Tayyorlanish" },
            ].map((f) => (
              <div key={f.title} className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{f.title}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              ⚠️ NeuraMed tashxis qo&apos;ymaydi va dori buyurmaydi. Faqat ma&apos;lumot beradi.
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Input
            label="Yosh"
            type="number"
            value={form.age}
            onChange={(e) => setForm((p) => ({ ...p, age: e.target.value }))}
            placeholder="Masalan: 25"
            min="1"
            max="150"
          />
          <div>
            <label className="label-base">Jins</label>
            <div className="grid grid-cols-2 gap-2">
              {genderOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, gender: opt.value }))}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left",
                    form.gender === opt.value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-transparent bg-slate-50 dark:bg-slate-700/50"
                  )}
                >
                  <span>{opt.icon}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bo'y (sm)"
              type="number"
              value={form.heightCm}
              onChange={(e) => setForm((p) => ({ ...p, heightCm: e.target.value }))}
              placeholder="170"
            />
            <Input
              label="Vazn (kg)"
              type="number"
              value={form.weightKg}
              onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
              placeholder="70"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="label-base">Allergiyalar</label>
            <div className="space-y-2 mt-1">
              {form.allergies.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input-base flex-1"
                    value={a}
                    onChange={(e) => updateItem("allergies", i, e.target.value)}
                    placeholder="Masalan: Penitsillin, chang..."
                  />
                  {form.allergies.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem("allergies", i)}
                      className="text-red-400 hover:text-red-600 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem("allergies")}
                className="text-xs text-primary-500 font-medium hover:underline"
              >
                + Qo&apos;shish
              </button>
            </div>
          </div>

          <div>
            <label className="label-base">Surunkali kasalliklar</label>
            <div className="space-y-2 mt-1">
              {form.chronicConditions.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input-base flex-1"
                    value={c}
                    onChange={(e) => updateItem("chronicConditions", i, e.target.value)}
                    placeholder="Masalan: Diabet, gipertoniya..."
                  />
                  {form.chronicConditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem("chronicConditions", i)}
                      className="text-red-400 hover:text-red-600 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem("chronicConditions")}
                className="text-xs text-primary-500 font-medium hover:underline"
              >
                + Qo&apos;shish
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center space-y-4 py-4">
          <div className="h-20 w-20 rounded-3xl bg-primary-50 dark:bg-primary-900/30 mx-auto flex items-center justify-center">
            <Check className="h-10 w-10 text-primary-500" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              Hammasi tayyor!
            </p>
            <p className="text-sm text-slate-500 mt-1">
              NeuraMed siz bilan ishlashga tayyor. Dori qidiring, tahlil yuklang yoki eslatma qo&apos;shing.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-left">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ Eslatma: NeuraMed tibbiy maslahat bermaydi. Shifokor ko&apos;rsatmasiz dori ichmang.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 1 && step < 4 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setStep((s) => s - 1)}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Orqaga
          </Button>
        )}

        {step < 3 && (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="flex-1"
          >
            Keyingi
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {step === 3 && (
          <Button
            type="button"
            onClick={() => setStep(4)}
            className="flex-1"
          >
            Keyingi
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}

        {step === 4 && (
          <Button
            type="button"
            onClick={handleFinish}
            className="flex-1"
            variant="gradient"
            loading={loading}
          >
            Boshlash
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {step < 4 && (
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="w-full text-center text-xs text-slate-400 mt-4 hover:text-slate-600"
        >
          O&apos;tkazib yuborish
        </button>
      )}
    </div>
  );
}

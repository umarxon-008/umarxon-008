"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Eye, EyeOff, Stethoscope, HeartPulse, Building2, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [form, setForm] = useState({
    specialty: "",
    clinicName: "",
    licenseNo: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError(t("Parollar mos kelmadi"));
      return;
    }
    if (form.password.length < 8) {
      setError(t("Parol kamida 8 ta belgi bo'lishi kerak"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          role,
          ...(role === "doctor" ? { specialty: form.specialty, clinicName: form.clinicName, licenseNo: form.licenseNo } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ro'yxatdan o'tish amalga oshmadi");
      setUser(data.user);
      router.push(role === "doctor" ? "/doctor" : "/onboarding");
    } catch (err) {
      setError(t(err instanceof Error ? err.message : "Xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("Ro'yxatdan o'tish")}</h2>
        <p className="text-sm text-slate-500 mt-1">{t("Yangi hisob yarating")}</p>
      </div>

      <div role="radiogroup" aria-label={t("Kim sifatida roʻyxatdan oʻtasiz?")} className="grid grid-cols-2 gap-2">
        {([
          { id: "patient", icon: HeartPulse, label: "Bemor", hint: "Oʻz salomatligimni kuzataman" },
          { id: "doctor", icon: Stethoscope, label: "Shifokor", hint: "Bemorlarimni qabul qilaman" },
        ] as const).map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={role === r.id} onClick={() => setRole(r.id)}
            className={cn("rounded-2xl border-2 p-3 text-left transition", role === r.id ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-slate-200 dark:border-slate-700")}>
            <r.icon className={cn("h-5 w-5", role === r.id ? "text-teal-600" : "text-slate-400")} />
            <span className="mt-1 block text-sm font-bold text-slate-900 dark:text-white">{t(r.label)}</span>
            <span className="block text-[11px] leading-snug text-slate-500">{t(r.hint)}</span>
          </button>
        ))}
      </div>

      <Input
        label={t("Ism *")}
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        placeholder={t("Ism Familiya")}
        leftIcon={<User className="h-4 w-4" />}
        required
      />
      <Input
        label={t("Email *")}
        type="email"
        value={form.email}
        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        placeholder={t("sizning@email.uz")}
        leftIcon={<Mail className="h-4 w-4" />}
        required
      />
      <Input
        label={t("Telefon (ixtiyoriy)")}
        type="tel"
        value={form.phone}
        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
        placeholder="+998 90 123 45 67"
        leftIcon={<Phone className="h-4 w-4" />}
      />
      {role === "doctor" && (
        <>
          <Input
            label={t("Mutaxassislik *")}
            value={form.specialty}
            onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
            placeholder={t("Masalan: Terapevt")}
            leftIcon={<Stethoscope className="h-4 w-4" />}
            required
          />
          <Input
            label={t("Ish joyi *")}
            value={form.clinicName}
            onChange={(e) => setForm((p) => ({ ...p, clinicName: e.target.value }))}
            placeholder={t("Klinika yoki poliklinika nomi")}
            leftIcon={<Building2 className="h-4 w-4" />}
            required
          />
          <Input
            label={t("Litsenziya raqami *")}
            value={form.licenseNo}
            onChange={(e) => setForm((p) => ({ ...p, licenseNo: e.target.value }))}
            placeholder="LIC-0000"
            leftIcon={<BadgeCheck className="h-4 w-4" />}
            required
          />
        </>
      )}

      <Input
        label={t("Parol *")}
        type={showPass ? "text" : "password"}
        value={form.password}
        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
        placeholder={t("Kamida 8 ta belgi")}
        leftIcon={<Lock className="h-4 w-4" />}
        rightIcon={
          <button type="button" onClick={() => setShowPass((v) => !v)}>
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        required
      />
      <Input
        label={t("Parolni tasdiqlang *")}
        type={showPass ? "text" : "password"}
        value={form.confirmPassword}
        onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
        placeholder={t("Parolni qayta kiriting")}
        leftIcon={<Lock className="h-4 w-4" />}
        required
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" loading={loading}>
        {t("Hisob yaratish")}
      </Button>

      <p className="text-center text-sm text-slate-500">
        {t("Hisobingiz bormi?")}{" "}
        <Link href="/login" className="text-primary-500 font-semibold hover:underline">
          {t("Kirish")}
        </Link>
      </p>

      <p className="text-xs text-slate-400 text-center leading-relaxed">
        {t("Ro'yxatdan o'tish orqali siz")}{" "}
        <span className="text-primary-500">{t("foydalanish shartlari")}</span>{t("ga rozilik bildirasiz")}
      </p>
    </form>
  );
}

"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ro'yxatdan o'tish amalga oshmadi");
      setUser(data.user);
      router.push("/onboarding");
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

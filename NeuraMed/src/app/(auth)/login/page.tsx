"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kirish amalga oshmadi");
      setUser(data.user);
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : data.user?.role === "doctor" ? "/doctor" : "/dashboard");
    } catch (err) {
      setError(t(err instanceof Error ? err.message : "Xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("Kirish")}</h2>
        <p className="text-sm text-slate-500 mt-1">{t("Hisobingizga kiring")}</p>
      </div>

      <Input
        label={t("Email")}
        type="email"
        value={form.email}
        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        placeholder={t("sizning@email.uz")}
        leftIcon={<Mail className="h-4 w-4" />}
        required
      />

      <Input
        label={t("Parol")}
        type={showPass ? "text" : "password"}
        value={form.password}
        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
        placeholder="••••••••"
        leftIcon={<Lock className="h-4 w-4" />}
        rightIcon={
          <button type="button" onClick={() => setShowPass((v) => !v)}>
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
        required
      />

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" className="w-full" size="lg" loading={loading}>
        {t("Kirish")}
      </Button>

      <p className="text-center text-sm text-slate-500">
        {t("Hisobingiz yo'qmi?")}{" "}
        <Link href="/register" className="text-primary-500 font-semibold hover:underline">
          {t("Ro'yxatdan o'ting")}
        </Link>
      </p>

    </form>
  );
}

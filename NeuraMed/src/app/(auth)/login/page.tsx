"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

export default function LoginPage() {
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
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kirish</h2>
        <p className="text-sm text-slate-500 mt-1">Hisobingizga kiring</p>
      </div>

      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        placeholder="sizning@email.uz"
        leftIcon={<Mail className="h-4 w-4" />}
        required
      />

      <Input
        label="Parol"
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
        Kirish
      </Button>

      <p className="text-center text-sm text-slate-500">
        Hisobingiz yo&apos;qmi?{" "}
        <Link href="/register" className="text-primary-500 font-semibold hover:underline">
          Ro&apos;yxatdan o&apos;ting
        </Link>
      </p>
    </form>
  );
}

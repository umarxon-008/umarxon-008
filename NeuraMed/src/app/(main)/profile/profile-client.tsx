"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Mail, Phone, Edit2, Save, X, Trash2,
  Download, Shield, LogOut, Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store";
import type { UserProfile } from "@/types";
import { cn } from "@/lib/utils";

interface Props { profile: UserProfile }

const genderLabels: Record<string, string> = {
  MALE: "Erkak", FEMALE: "Ayol", OTHER: "Boshqa", PREFER_NOT_TO_SAY: "Aytmayman",
};
const pregnancyLabels: Record<string, string> = {
  NOT_APPLICABLE: "Yo'q", PREGNANT: "Homilador",
  BREASTFEEDING: "Emizmoqda", PLANNING: "Rejalashtirilmoqda",
};

export function ProfileClient({ profile: initial }: Props) {
  const t = useT();
  const router = useRouter();
  const { clearUser } = useAuthStore();
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({ ...initial });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          age: form.age,
          gender: form.gender,
          heightCm: form.heightCm,
          weightKg: form.weightKg,
          allergies: form.allergies.filter(Boolean),
          chronicConditions: form.chronicConditions.filter(Boolean),
          currentMedications: form.currentMedications.filter(Boolean),
          pregnancyStatus: form.pregnancyStatus,
          emergencyContact: form.emergencyContact,
          language: form.language,
        }),
      });
      if (res.ok) {
        setProfile({ ...form });
        setEditing(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await fetch("/api/profile", { method: "DELETE" });
      clearUser();
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth?action=logout", { method: "POST" });
    clearUser();
    router.push("/login");
  };

  const updateArr = (
    field: "allergies" | "chronicConditions" | "currentMedications",
    i: number, val: string
  ) => setForm((p) => { const a = [...p[field]]; a[i] = val; return { ...p, [field]: a }; });

  const addToArr = (field: "allergies" | "chronicConditions" | "currentMedications") =>
    setForm((p) => ({ ...p, [field]: [...p[field], ""] }));

  const removeFromArr = (
    field: "allergies" | "chronicConditions" | "currentMedications", i: number
  ) => setForm((p) => ({ ...p, [field]: p[field].filter((_, idx) => idx !== i) }));

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center shrink-0">
          <span className="text-white text-2xl font-bold">
            {(profile.name || "F")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {profile.name || t("Foydalanuvchi")}
          </h2>
          <p className="text-sm text-slate-400 truncate">{profile.email || profile.phone}</p>
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => editing ? setEditing(false) : setEditing(true)}
        >
          {editing ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary-500" />
            {t("Shaxsiy ma'lumot")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {editing ? (
            <>
              <Input label={t("Ism")} value={form.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t("Yosh")} type="number" value={form.age?.toString() || ""} onChange={(e) => setForm((p) => ({ ...p, age: parseInt(e.target.value) || undefined }))} />
                <div>
                  <label className="label-base">{t("Jins")}</label>
                  <select
                    className="input-base"
                    value={form.gender || ""}
                    onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as UserProfile["gender"] }))}
                  >
                    <option value="">{t("Tanlang")}</option>
                    {Object.entries(genderLabels).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={t("Bo'y (sm)")} type="number" value={form.heightCm?.toString() || ""} onChange={(e) => setForm((p) => ({ ...p, heightCm: parseFloat(e.target.value) || undefined }))} />
                <Input label={t("Vazn (kg)")} type="number" value={form.weightKg?.toString() || ""} onChange={(e) => setForm((p) => ({ ...p, weightKg: parseFloat(e.target.value) || undefined }))} />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label={t("Yosh")} value={profile.age ? `${profile.age} yosh` : "—"} />
              <InfoItem label={t("Jins")} value={profile.gender ? t(genderLabels[profile.gender]) : "—"} />
              <InfoItem label={t("Bo'y")} value={profile.heightCm ? `${profile.heightCm} sm` : "—"} />
              <InfoItem label={t("Vazn")} value={profile.weightKg ? `${profile.weightKg} kg` : "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            {t("Kontakt")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <InfoItem label={t("Email")} value={profile.email || "—"} />
            <InfoItem label={t("Telefon")} value={profile.phone || "—"} />
          </div>
        </CardContent>
      </Card>

      {/* Health info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            {t("Sog'liq ma'lumoti")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Allergies */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">{t("Allergiyalar")}</p>
            {editing ? (
              <div className="space-y-2">
                {form.allergies.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input-base flex-1" value={a}
                      onChange={(e) => updateArr("allergies", i, e.target.value)} />
                    {form.allergies.length > 1 && (
                      <button type="button" onClick={() => removeFromArr("allergies", i)} className="text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addToArr("allergies")} className="text-xs text-primary-500 font-medium flex items-center gap-1">
                  <Plus className="h-3 w-3" /> {t("Qo'shish")}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.allergies.length > 0
                  ? profile.allergies.map((a, i) => <Badge key={i} variant="warning">{a}</Badge>)
                  : <span className="text-xs text-slate-400">{t("Yo'q")}</span>}
              </div>
            )}
          </div>

          {/* Chronic conditions */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">{t("Surunkali kasalliklar")}</p>
            {editing ? (
              <div className="space-y-2">
                {form.chronicConditions.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input-base flex-1" value={c}
                      onChange={(e) => updateArr("chronicConditions", i, e.target.value)} />
                    {form.chronicConditions.length > 1 && (
                      <button type="button" onClick={() => removeFromArr("chronicConditions", i)} className="text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addToArr("chronicConditions")} className="text-xs text-primary-500 font-medium flex items-center gap-1">
                  <Plus className="h-3 w-3" /> {t("Qo'shish")}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.chronicConditions.length > 0
                  ? profile.chronicConditions.map((c, i) => <Badge key={i} variant="violet">{c}</Badge>)
                  : <span className="text-xs text-slate-400">{t("Yo'q")}</span>}
              </div>
            )}
          </div>

          {/* Pregnancy */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">{t("Homiladorlik holati")}</p>
            {editing ? (
              <select className="input-base" value={form.pregnancyStatus}
                onChange={(e) => setForm((p) => ({ ...p, pregnancyStatus: e.target.value as UserProfile["pregnancyStatus"] }))}>
                {Object.entries(pregnancyLabels).map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}
              </select>
            ) : (
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {t(pregnancyLabels[profile.pregnancyStatus])}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      {editing && (
        <Button variant="gradient" className="w-full" onClick={handleSave} loading={loading}>
          <Save className="h-4 w-4" />
          {t("Saqlash")}
        </Button>
      )}

      {/* Actions */}
      {!editing && (
        <div className="space-y-2 pt-2">
          <Button variant="secondary" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            {t("Chiqish")}
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            {t("Hisobni o'chirish")}
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end p-4">
          <div className="w-full max-w-sm mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("Hisobni o'chirish")}
            </h3>
            <p className="text-sm text-slate-500">
              {t("Barcha ma'lumotlaringiz (tahlillar, eslatmalar, profil) o'chib ketadi. Bu amal qaytarib bo'lmaydi.")}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>
                {t("Bekor")}
              </Button>
              <Button variant="destructive" className="flex-1 bg-red-600 text-white hover:bg-red-700"
                onClick={handleDelete} loading={loading}>
                {t("O'chirish")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

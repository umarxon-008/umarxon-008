"use client";

import * as React from "react";
import Link from "next/link";
import { IdCard, QrCode, Copy, RefreshCw, Eye, EyeOff, Phone, Droplets, AlertTriangle, Pill, HeartPulse, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading";
import { api, DemoNote, ModuleHero, Toast } from "@/components/modules/common";

interface Data {
  card: { bloodType: string | null; notes: string; shareEnabled: boolean };
  profile: { name: string | null; age: number | null; gender: string | null; allergies: string[]; chronicConditions: string[]; emergencyContact: { name: string; phone: string } | null } | null;
  medications: string[];
  shareUrl: string | null;
  qrSvg: string | null;
  bloodTypes: string[];
}

export function MedcardClient() {
  const t = useT();
  const [d, setD] = React.useState<Data | null>(null);
  const [blood, setBlood] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [cName, setCName] = React.useState("");
  const [cPhone, setCPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const fill = (r: Data) => {
    setD(r); setBlood(r.card.bloodType || ""); setNotes(r.card.notes || "");
    setCName(r.profile?.emergencyContact?.name || ""); setCPhone(r.profile?.emergencyContact?.phone || "");
  };
  React.useEffect(() => { api<Data>("/api/health-card").then(fill).catch((e) => setError(t(e.message))); }, [t]);

  const patch = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true); setError(null);
    try { fill(await api<Data>("/api/health-card", { method: "PATCH", json: body })); setToast(t(msg)); }
    catch (e: any) { setError(t(e.message)); } finally { setBusy(false); }
  };

  const save = () => patch({ bloodType: blood || null, notes, emergencyContact: cName.trim() ? { name: cName, phone: cPhone } : null }, "Tibbiy karta saqlandi");

  const copy = async () => {
    if (!d?.shareUrl) return;
    try { await navigator.clipboard.writeText(d.shareUrl); setToast(t("Havola nusxalandi")); } catch { setToast(t("Nusxalab boʻlmadi")); }
  };

  if (!d) return <div className="p-4">{error ? <p className="text-sm text-red-600">{error}</p> : <LoadingCard />}</div>;
  const p = d.profile;

  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={IdCard} name="Salomatligim" title={t("Tibbiy karta — bitta QR kodda")} text="Qon guruhi, allergiyalar, kasalliklar va dorilar. Shifokor yoki tez yordam QR kodni skanerlab, eng muhim maʼlumotni darhol koʻradi." />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Karta ko'rinishi */}
        <section className="rounded-3xl bg-gradient-brand-deep p-5 text-white shadow-card">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">{t("Tibbiy karta")}</p>
              <h2 className="mt-1 text-xl font-extrabold truncate">{p?.name || "—"}</h2>
              <p className="text-sm text-white/70">{p?.age ? t("{n} yosh", { n: p.age }) : ""}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/20">
              <p className="text-[10px] uppercase tracking-wider text-white/60">{t("Qon guruhi")}</p>
              <p className="text-lg font-extrabold">{d.card.bloodType || "—"}</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <Row icon={AlertTriangle} label={t("Allergiyalar")} value={p?.allergies.length ? p.allergies.map((x) => t(x)).join(", ") : t("Yoʻq")} strong={!!p?.allergies.length} />
            <Row icon={HeartPulse} label={t("Surunkali kasalliklar")} value={p?.chronicConditions.length ? p.chronicConditions.map((x) => t(x)).join(", ") : t("Yoʻq")} />
            <Row icon={Pill} label={t("Qabul qilayotgan dorilar")} value={d.medications.length ? d.medications.join(", ") : t("Yoʻq")} />
            <Row icon={Phone} label={t("Favqulodda aloqa")} value={p?.emergencyContact ? `${t(p.emergencyContact.name)} · ${p.emergencyContact.phone}` : t("Koʻrsatilmagan")} />
          </dl>
          <p className="mt-4 text-[11px] text-white/60">{t("Allergiya va kasalliklarni Profil boʻlimida oʻzgartirasiz.")} <Link href="/profile" className="underline">{t("Profilga oʻtish")}</Link></p>
        </section>

        {/* QR */}
        <section className="card-base p-5 flex flex-col gap-3">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><QrCode className="h-5 w-5 text-teal-600 dark:text-teal-400" />{t("QR orqali ulashish")}</h3>
          <p className="text-sm text-slate-500">{t("Yoqilganda, QR kodni skanerlagan odam faqat karta maʼlumotlarini koʻradi (tahlillar va yozishmalar emas). Istalgan vaqtda oʻchirishingiz mumkin.")}</p>
          {d.card.shareEnabled && d.qrSvg ? (
            <>
              <div className="mx-auto w-52 rounded-2xl bg-white p-3 ring-1 ring-slate-200" role="img" aria-label={t("Tibbiy karta QR kodi")} dangerouslySetInnerHTML={{ __html: d.qrSvg }} />
              <p className="break-all rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{d.shareUrl}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={copy}><Copy className="h-4 w-4" /> {t("Nusxalash")}</Button>
                <a href={d.shareUrl || "#"} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><Eye className="h-4 w-4" /> {t("Koʻrish")}</Button></a>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => patch({ regenerate: true }, "Yangi havola yaratildi — eskisi endi ishlamaydi")}><RefreshCw className="h-4 w-4" /> {t("Havolani yangilash")}</Button>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => patch({ shareEnabled: false }, "Ulashish oʻchirildi")}><EyeOff className="h-4 w-4" /> {t("Oʻchirish")}</Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
              <QrCode className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500">{t("Ulashish oʻchirilgan — QR kod hech kimga koʻrinmaydi.")}</p>
              <Button variant="gradient" disabled={busy} onClick={() => patch({ shareEnabled: true }, "QR kod yaratildi")}>{t("QR kodni yaratish")}</Button>
            </div>
          )}
        </section>
      </div>

      {/* Tahrirlash */}
      <section className="card-base p-5 space-y-4">
        <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Pencil className="h-4 w-4 text-teal-600 dark:text-teal-400" />{t("Kartani toʻldirish")}</h3>
        <div>
          <p className="label-base flex items-center gap-1.5"><Droplets className="h-4 w-4 text-red-500" />{t("Qon guruhi")}</p>
          <div className="flex flex-wrap gap-2">
            {d.bloodTypes.map((b) => (
              <button key={b} type="button" onClick={() => setBlood(blood === b ? "" : b)} aria-pressed={blood === b}
                className={cn("rounded-xl border px-3 py-1.5 text-sm font-semibold", blood === b ? "border-transparent bg-gradient-primary text-white" : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200")}>{b}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="label-base">{t("Favqulodda aloqa — ism")}</span><input className="input-base" value={cName} maxLength={60} onChange={(e) => setCName(e.target.value)} placeholder={t("Masalan: Karim (turmush oʻrtogʻi)")} /></label>
          <label className="block"><span className="label-base">{t("Favqulodda aloqa — telefon")}</span><input className="input-base" value={cPhone} onChange={(e) => setCPhone(e.target.value)} inputMode="tel" placeholder="+998 90 123 45 67" /></label>
        </div>
        <label className="block"><span className="label-base">{t("Shifokor uchun izoh (ixtiyoriy)")}</span>
          <textarea className="input-base" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Masalan: astma, ingalyator sumkada")} /></label>
        {error && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
        <Button variant="gradient" disabled={busy} onClick={save}>{t("Saqlash")}</Button>
      </section>

      <DemoNote>{t("Demo: karta maʼlumotlari faqat shu platforma bazasida saqlanadi. Real versiyada havola faqat shifokor va tez yordam uchun vaqtinchalik ochiladi.")}</DemoNote>
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function Row({ icon: Icon, label, value, strong }: { icon: React.ElementType; label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/10 p-3">
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", strong ? "text-amber-300" : "text-emerald-200")} />
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wider text-white/60">{label}</dt>
        <dd className={cn("text-sm", strong && "font-bold")}>{value}</dd>
      </div>
    </div>
  );
}

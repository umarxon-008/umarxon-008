"use client";

import * as React from "react";
import Link from "next/link";
import { Siren, Phone, MapPin, Share2, Copy, IdCard, AlertTriangle, Droplets, Pill } from "lucide-react";
import { useT } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { api, DemoNote, Toast } from "@/components/modules/common";

interface Card { card: { bloodType: string | null }; profile: { name: string | null; allergies: string[]; chronicConditions: string[]; emergencyContact: { name: string; phone: string } | null } | null; medications: string[]; shareUrl: string | null }

const STEPS = [
  "Xotirjam boʻling va xavfsiz joyda ekaningizga ishonch hosil qiling.",
  "103 ga qoʻngʻiroq qiling: nima boʻlganini, manzilni va bemorning holatini aniq ayting.",
  "Operator koʻrsatmalariga amal qiling, telefonni oʻchirmang.",
  "Yaqiningizga joylashuvingizni yuboring va tibbiy kartani tayyorlab qoʻying.",
];

export function SosClient() {
  const t = useT();
  const [card, setCard] = React.useState<Card | null>(null);
  const [loc, setLoc] = React.useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [locError, setLocError] = React.useState<string | null>(null);
  const [locBusy, setLocBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => { api<Card>("/api/health-card").then(setCard).catch(() => {}); }, []);

  const mapsUrl = loc ? `https://maps.google.com/?q=${loc.lat.toFixed(6)},${loc.lon.toFixed(6)}` : "";
  const message = loc ? t("Menga yordam kerak. Joylashuvim: {url}", { url: mapsUrl }) + (card?.shareUrl ? ` · ${t("Tibbiy kartam:")} ${card.shareUrl}` : "") : "";

  const locate = () => {
    setLocError(null);
    if (!("geolocation" in navigator)) { setLocError(t("Brauzeringiz joylashuvni aniqlay olmaydi.")); return; }
    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) }); setLocBusy(false); },
      () => { setLocError(t("Joylashuvga ruxsat berilmadi. Brauzer sozlamalarida ruxsat bering yoki manzilni ogʻzaki ayting.")); setLocBusy(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "SOS", text: message });
      else { await navigator.clipboard.writeText(message); setToast(t("Xabar nusxalandi — uni yaqiningizga yuboring")); }
    } catch { /* foydalanuvchi bekor qildi */ }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(message); setToast(t("Xabar nusxalandi — uni yaqiningizga yuboring")); } catch { setToast(t("Nusxalab boʻlmadi")); } };
  const contact = card?.profile?.emergencyContact;

  return (
    <div className="px-4 py-4 space-y-4">
      <section className="rounded-3xl bg-red-600 p-5 text-white shadow-card">
        <div className="flex items-center gap-3"><Siren className="h-7 w-7" /><h2 className="text-xl font-extrabold">{t("Shoshilinch yordam")}</h2></div>
        <p className="mt-1 text-sm text-white/85">{t("Hayot uchun xavf boʻlsa — kutmang, darhol qoʻngʻiroq qiling.")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href="tel:103" className="rounded-2xl bg-white p-4 text-center text-red-700 shadow"><Phone className="mx-auto h-6 w-6" /><p className="mt-1 text-3xl font-black">103</p><p className="text-xs font-semibold">{t("Tez tibbiy yordam")}</p></a>
          <a href="tel:112" className="rounded-2xl bg-white/15 p-4 text-center ring-1 ring-white/40"><Phone className="mx-auto h-6 w-6" /><p className="mt-1 text-3xl font-black">112</p><p className="text-xs font-semibold">{t("Yagona favqulodda raqam")}</p></a>
        </div>
        {contact && (
          <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-white/15 p-3 ring-1 ring-white/30">
            <Phone className="h-5 w-5" /><span className="flex-1 text-sm"><b>{t(contact.name)}</b><br /><span className="text-white/80">{contact.phone}</span></span><span className="text-xs font-semibold">{t("Qoʻngʻiroq")}</span>
          </a>
        )}
      </section>

      <section className="card-base p-4 space-y-3">
        <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><MapPin className="h-5 w-5 text-red-600" />{t("Joylashuvni yaqiningizga yuborish")}</h3>
        {!loc ? <Button variant="outline" onClick={locate} disabled={locBusy}><MapPin className="h-4 w-4" /> {locBusy ? t("Aniqlanmoqda…") : t("Joylashuvimni aniqlash")}</Button> : (
          <>
            <p className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 break-all">{message}</p>
            <p className="text-[11px] text-slate-400">{t("Aniqlik: ~{m} m", { m: loc.acc })}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="gradient" onClick={share}><Share2 className="h-4 w-4" /> {t("Ulashish")}</Button>
              <Button variant="outline" onClick={copy}><Copy className="h-4 w-4" /> {t("Nusxalash")}</Button>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"><Button variant="ghost">{t("Xaritada koʻrish")}</Button></a>
            </div>
          </>
        )}
        {locError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{locError}</p>}
      </section>

      <section className="card-base p-4 space-y-2">
        <h3 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"><IdCard className="h-5 w-5 text-teal-600 dark:text-teal-400" />{t("Tez yordam uchun maʼlumot")}</h3>
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <Info icon={Droplets} label={t("Qon guruhi")} value={card?.card.bloodType || "—"} />
          <Info icon={AlertTriangle} label={t("Allergiyalar")} value={card?.profile?.allergies.length ? card.profile.allergies.map((x) => t(x)).join(", ") : t("Yoʻq")} />
          <Info icon={Pill} label={t("Qabul qilayotgan dorilar")} value={card?.medications.length ? card.medications.join(", ") : t("Yoʻq")} />
        </div>
        <Link href="/medcard" className="inline-block text-sm font-semibold text-teal-700 dark:text-teal-400 underline">{t("Tibbiy kartani ochish va QR koʻrsatish")}</Link>
      </section>

      <section className="card-base p-4">
        <h3 className="font-bold text-slate-900 dark:text-white">{t("Nima qilish kerak")}</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-600 dark:text-slate-300">{STEPS.map((s) => <li key={s}>{t(s)}</li>)}</ol>
      </section>

      <DemoNote>{t("Demo: NeuraMed SMS yoki qoʻngʻiroqni avtomatik yubormaydi — tugmalar telefoningizning oʻz ilovasini ochadi, xabarni oʻzingiz yuborasiz.")}</DemoNote>
      <Toast text={toast} onDone={() => setToast(null)} />
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><Icon className="h-3.5 w-3.5" />{label}</p>
      <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

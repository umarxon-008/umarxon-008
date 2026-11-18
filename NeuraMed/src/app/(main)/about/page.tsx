import { getT } from "@/i18n/server";
import Link from "next/link";
import { MessageSquare, ScanSearch, CalendarDays, Stethoscope, Pill, ShieldCheck, Server, Users, HeartPulse } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { BrandLogo } from "@/components/layout/brand-logo";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Loyiha haqida") };
}

const MODULES = [
  { icon: Stethoscope, name: "Shifokor paneli", text: "Shifokor oʻziga yozilgan bemorlarni koʻradi, chekap oʻtkazadi, koʻrsatkich kiritadi, xulosa va javob yozadi, ish jadvalini belgilaydi.", status: "Ishlaydi" },
  { icon: HeartPulse, name: "Salomatligim", text: "QR tibbiy karta va chekap: salomatlik balli, shifokor xulosasi, koʻrsatkichlar dinamikasi (bemor faqat koʻradi).", status: "Ishlaydi" },
  { icon: Pill, name: "Shaxsiy yordamchi", text: "Dorilar (eslatma, qidiruv, mosligi) va tahlillar (laboratoriya, rentgen) — oddiy tilda tushuntirish.", status: "Ishlaydi" },
  { icon: MessageSquare, name: "MEDAI", text: "AI yordamchi va 26 atamali tibbiy kutubxona.", status: "Ishlaydi" },
  { icon: ScanSearch, name: "PHARMA TRACE", text: "Mahalliy dorilarga ishonch: haqiqiylik, sertifikat, laboratoriya natijalari, ishonch indeksi va mahalliy muqobil.", status: "Ishlaydi" },
  { icon: CalendarDays, name: "MEDCONNECT", text: "Shifokor topish, qabulga yozilish, qabulga tayyorlanish va shifokor bilan chat — bitta sahifada.", status: "Ishlaydi" },
];

export default async function AboutPage() {
  const t = await getT();
  return (
    <>
      <TopBar title={t("Loyiha haqida")} />
      <div className="px-4 py-4 space-y-4">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-brand-deep p-6 text-white">
          <div className="flex items-center gap-4">
            <span className="rounded-3xl bg-white p-1.5"><BrandLogo size={72} /></span>
            <div>
              <h2 className="text-2xl font-black">{t("NeuraMed")}</h2>
              <p className="text-sm text-white/75">{t("Bemor va shifokorni bogʻlaydigan yagona tibbiy platforma")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            {t("NeuraMed ikki rol uchun: bemor oʻz salomatligini kuzatadi, shifokor esa oʻz panelida bemorlarini koʻradi va chekap oʻtkazadi. Barcha boʻlimlar bitta dizayn va bitta backend (Next.js API + Prisma) ustida ishlaydi.")}
          </p>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          {MODULES.map((m) => (
            <article key={m.name} className="card-base p-4 flex gap-3">
              <span className="module-icon h-11 w-11 shrink-0"><m.icon className="h-5 w-5" /></span>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{t(m.name)} <span className="ml-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{t(m.status)}</span></p>
                <p className="mt-1 text-sm text-slate-500">{t(m.text)}</p>
              </div>
            </article>
          ))}
        </div>

        <section className="card-base p-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" /> {t("Xavfsizlik qoidalari")}</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("Tashxis qoʻyilmaydi, dori dozasi tavsiya qilinmaydi.")}</li>
            <li>{t("Xavfli belgilar aniqlansa — 103 / 112 ga qoʻngʻiroq qilish haqida ogohlantirish.")}</li>
          </ul>
        </section>


        <section className="card-base p-4 text-sm text-slate-600 dark:text-slate-300">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Server className="h-4 w-4 text-violet-600 dark:text-violet-400" /> {t("Texnologiyalar")}</h3>
          <p className="mt-1">{t("Next.js 14 · TypeScript · Tailwind CSS · Prisma (PostgreSQL yoki lokal JSON baza) · JWT sessiya · OpenAI (ixtiyoriy) · PWA")}</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Users className="h-3.5 w-3.5" /> {t("NeuraMed jamoasi ·")} <Link href="/dashboard" className="text-teal-700 dark:text-teal-400 underline">{t("Bosh sahifaga")}</Link></p>
        </section>
      </div>
    </>
  );
}

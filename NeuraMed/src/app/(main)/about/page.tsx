import { getT } from "@/i18n/server";
import Link from "next/link";
import { MessageSquare, ScanSearch, CalendarDays, Boxes, Pill, ShieldCheck, FlaskConical, Server, Users } from "lucide-react";
import { TopBar } from "@/components/layout/top-bar";
import { BrandLogo } from "@/components/layout/brand-logo";
import { isAIEnabled } from "@/lib/ai";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Loyiha haqida") };
}

const MODULES = [
  { icon: Pill, name: "Shaxsiy yordamchi", text: "Dori maʼlumoti, eslatmalar, tahlil va rentgen hisobotlarini oddiy tilda tushuntirish, shifokorga tayyorlanish.", status: "Ishlaydi" },
  { icon: MessageSquare, name: "MEDAI", text: "AI yordamchi va 26 atamali tibbiy kutubxona. OpenAI kaliti boʻlmasa — qoidaga asoslangan demo javob.", status: "Ishlaydi · demo/AI" },
  { icon: ScanSearch, name: "PHARMA TRACE", text: "QR kod/partiya orqali dorining ishlab chiqaruvchidan dorixonagacha yoʻli va shubhali holat haqida xabar.", status: "Demo maʼlumot" },
  { icon: CalendarDays, name: "MEDCONNECT", text: "Shifokor va muassasa katalogi, boʻsh vaqtlar, qabulga yozilish, shifokor bilan chat.", status: "Demo maʼlumot" },
  { icon: Boxes, name: "MEDSTOCK AI", text: "Dorixona zaxirasi: kam qolgan va muddati yaqin dorilar, sarf grafigi, buyurtma tavsiyasi.", status: "Demo maʼlumot" },
];

export default async function AboutPage() {
  const t = await getT();
  const ai = isAIEnabled();
  return (
    <>
      <TopBar title={t("Loyiha haqida")} />
      <div className="px-4 py-4 space-y-4">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-brand-deep p-6 text-white">
          <div className="flex items-center gap-4">
            <span className="rounded-3xl bg-white p-1.5"><BrandLogo size={72} /></span>
            <div>
              <h2 className="text-2xl font-black">{t("NeuraMed")}</h2>
              <p className="text-sm text-white/75">{t("Bemor, shifokor va dorixonani bogʻlaydigan yagona tibbiy platforma")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            {t("NeuraMed — ikki loyihaning birlashmasi: shaxsiy tibbiy yordamchi (NeuraMed) va MEDPERFECT platformasi (MEDAI, PHARMA TRACE, MEDCONNECT, MEDSTOCK AI). Barcha modullar bitta hisob, bitta dizayn va bitta backend (Next.js API + Prisma) ustida ishlaydi.")}
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
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-600" /> {t("Xavfsizlik qoidalari")}</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("Tashxis qoʻyilmaydi, dori dozasi tavsiya qilinmaydi.")}</li>
            <li>{t("Xavfli belgilar aniqlansa — 103 / 112 ga qoʻngʻiroq qilish haqida ogohlantirish.")}</li>
            <li>{t("Namunaviy maʼlumotlar har doim “DEMO” yoki “(namuna)” belgisi bilan koʻrsatiladi.")}</li>
          </ul>
        </section>

        <section className="card-base p-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><FlaskConical className="h-4 w-4 text-amber-600" /> {t("Hozirgi holat (hakaton demo)")}</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t("AI:")} {ai ? t("OpenAI ulangan") : t("OpenAI kaliti oʻrnatilmagan — demo rejim")}.</li>
            <li>{t("Shifokorlar, muassasalar, dori partiyalari va ombor — toʻqima namunalar; real tizimlarga ulanmagan.")}</li>
            <li>{t("Qabul, xabar va shikoyatlar faqat platforma bazasida saqlanadi, tashqariga yuborilmaydi.")}</li>
          </ul>
        </section>

        <section className="card-base p-4 text-sm text-slate-600 dark:text-slate-300">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Server className="h-4 w-4 text-violet-600" /> {t("Texnologiyalar")}</h3>
          <p className="mt-1">{t("Next.js 14 · TypeScript · Tailwind CSS · Prisma (PostgreSQL yoki lokal JSON baza) · JWT sessiya · OpenAI (ixtiyoriy) · PWA")}</p>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Users className="h-3.5 w-3.5" /> {t("NeuraMed jamoasi ·")} <Link href="/dashboard" className="text-teal-700 underline">{t("Bosh sahifaga")}</Link></p>
        </section>
      </div>
    </>
  );
}

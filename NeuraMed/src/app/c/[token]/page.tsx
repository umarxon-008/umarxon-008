import { AlertTriangle, Droplets, HeartPulse, Pill, Phone, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getT } from "@/i18n/server";
import { BrandLogo } from "@/components/layout/brand-logo";
import { activeMedicationNames, decryptText, getHealthProfile } from "@/lib/modules/health-profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "NeuraMed", robots: { index: false, follow: false } };

/** QR orqali ochiladigan tibbiy karta (faqat o'qish, kirish talab qilinmaydi). */
export default async function PublicCardPage({ params }: { params: { token: string } }) {
  const t = await getT();
  const token = String(params.token || "").slice(0, 64);
  const card: any = token ? await prisma.healthCard.findFirst({ where: { shareToken: token } }) : null;
  const profile = card && card.shareEnabled ? await getHealthProfile(card.userId) : null;

  if (!card || !card.shareEnabled || !profile) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="card-base max-w-sm p-6 text-center space-y-3">
          <BrandLogo size={56} />
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t("Karta topilmadi yoki ulashish oʻchirilgan")}</h1>
          <p className="text-sm text-slate-500">{t("Egasi havolani bekor qilgan boʻlishi mumkin.")}</p>
        </div>
      </main>
    );
  }
  const meds = await activeMedicationNames(card.userId, profile.currentMedications);
  const notes = decryptText(card.notes);
  const item = (Icon: React.ElementType, label: string, value: string, warn?: boolean) => (
    <div className={`flex gap-3 rounded-2xl p-3.5 ${warn ? "bg-amber-50 dark:bg-amber-900/30" : "bg-slate-50 dark:bg-slate-800"}`}>
      <Icon className={`h-5 w-5 shrink-0 ${warn ? "text-amber-600 dark:text-amber-400" : "text-teal-600 dark:text-teal-400"}`} />
      <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="text-sm font-semibold text-slate-900 dark:text-white">{value}</p></div>
    </div>
  );
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between"><BrandLogo size={36} withName /><span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">{t("Shoshilinch: 103 / 112")}</span></div>
        <section className="card-base p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">{t("Tibbiy karta")}</p>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{profile.name || "—"}</h1>
              {profile.age ? <p className="text-sm text-slate-500">{t("{n} yosh", { n: profile.age })}</p> : null}</div>
            <div className="rounded-2xl bg-red-50 dark:bg-red-900/30 px-3 py-2 text-center"><Droplets className="mx-auto h-4 w-4 text-red-600" /><p className="text-lg font-extrabold text-red-700 dark:text-red-300">{card.bloodType || "—"}</p></div>
          </div>
          {item(AlertTriangle, t("Allergiyalar"), profile.allergies.length ? profile.allergies.map((x) => t(x)).join(", ") : t("Yoʻq"), profile.allergies.length > 0)}
          {item(HeartPulse, t("Surunkali kasalliklar"), profile.chronicConditions.length ? profile.chronicConditions.map((x) => t(x)).join(", ") : t("Yoʻq"))}
          {item(Pill, t("Qabul qilayotgan dorilar"), meds.length ? meds.join(", ") : t("Yoʻq"))}
          {profile.emergencyContact && item(Phone, t("Favqulodda aloqa"), `${t(profile.emergencyContact.name)} · ${profile.emergencyContact.phone}`)}
          {notes && item(ShieldCheck, t("Shifokor uchun izoh"), notes)}
        </section>
        <p className="text-center text-[11px] leading-relaxed text-slate-400">{t("Maʼlumotni karta egasi oʻzi kiritgan va ulashgan. NeuraMed tashxis qoʻymaydi.")}</p>
      </div>
    </main>
  );
}

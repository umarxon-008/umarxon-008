import { Pill, FlaskConical, HeartPulse, Stethoscope, Phone } from "lucide-react";
import { getT } from "@/i18n/server";
import { BrandLogo } from "@/components/layout/brand-logo";

const FEATURES = [
  { icon: Pill, label: "Dorilar va eslatmalar" },
  { icon: FlaskConical, label: "Tahlillar oddiy tilda" },
  { icon: HeartPulse, label: "Shifokor chekapi" },
  { icon: Stethoscope, label: "Shifokor bilan aloqa" },
];

/** Kirish va ro'yxatdan o'tish: chapda brend paneli (kompyuterda), o'ngda forma; pastda ixcham footer. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brend paneli — faqat kompyuterda */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0A4A4A] p-12 text-white">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-white p-1"><BrandLogo size={52} /></span>
          <span className="text-2xl font-extrabold tracking-wide">{t("NeuraMed")}</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">{t("Bemor va shifokor — bitta platformada")}</h1>
          <p className="mt-4 text-lg text-white/80">{t("Dorilar, tahlillar, chekap va shifokor bilan aloqa — oddiy va tushunarli.")}</p>
          <ul className="mt-10 grid grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
                <f.icon className="h-6 w-6 shrink-0 text-[#93D9D1]" />
                <span className="text-base font-semibold">{t(f.label)}</span>
              </li>
            ))}
          </ul>
        </div>
        <footer className="flex items-center justify-between text-sm text-white/70">
          <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" />{t("Shoshilinch holatda — 103")}</span>
          <span>© 2026 NeuraMed · Toshkent AI Hackathon</span>
        </footer>
      </aside>

      {/* Forma */}
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <span className="mb-3 rounded-[24px] bg-white p-1 shadow-card"><BrandLogo size={72} /></span>
            <span className="text-2xl font-extrabold text-primary-700 dark:text-primary-300">{t("NeuraMed")}</span>
            <span className="mt-1 text-base text-slate-600 dark:text-slate-300">{t("Bemor va shifokor — bitta platformada")}</span>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-card dark:border-slate-800 dark:bg-slate-900">
            {children}
          </div>
        </div>
        <footer className="mt-10 w-full max-w-md text-center lg:hidden">
          <ul className="grid grid-cols-2 gap-2">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-soft dark:bg-slate-900 dark:text-slate-200">
                <f.icon className="h-5 w-5 shrink-0 text-primary-600" />{t(f.label)}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-500">{t("Shoshilinch holatda — 103")} · © 2026 NeuraMed</p>
        </footer>
      </main>
    </div>
  );
}

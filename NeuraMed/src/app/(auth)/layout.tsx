import { getT } from "@/i18n/server";
import { BrandLogo } from "@/components/layout/brand-logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <div className="min-h-screen bg-gradient-brand-deep flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4 rounded-[28px] bg-white p-1.5 shadow-2xl">
            <BrandLogo size={88} />
          </div>
          <h1 className="text-2xl font-black text-white">{t("NeuraMed")}</h1>
          <p className="text-sm text-white/70 mt-1">{t("Yagona tibbiyot va farmatsevtika platformasi")}</p>
        </div>
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6">
          {children}
        </div>
        <footer className="text-center text-[11px] leading-relaxed text-white/60 mt-6">
          <p>{t("NeuraMed tashxis qoʻymaydi va dori buyurmaydi. Shoshilinch holatda — 103.")}</p>
          <p className="mt-1">© 2026 NeuraMed · Toshkent AI Hackathon</p>
        </footer>
      </div>
    </div>
  );
}

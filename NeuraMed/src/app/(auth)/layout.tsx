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
        <p className="text-center text-xs text-white/50 mt-6">
          {t("© 2026 NeuraMed. Tibbiy maslahat emas.")}
        </p>
      </div>
    </div>
  );
}

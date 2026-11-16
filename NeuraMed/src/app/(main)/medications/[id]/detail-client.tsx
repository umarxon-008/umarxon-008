"use client";

import { useT } from "@/i18n/client";
import Link from "next/link";
import {
  Pill,
  Info,
  Clock,
  Utensils,
  AlertTriangle,
  Heart,
  Phone,
  ExternalLink,
  Bell,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import type { MedicationInfo, MedicationSource } from "@/types";

interface Props {
  info: MedicationInfo | null;
  drugName: string;
  medicationId?: string;
}

function CardSourceLink({ source }: { source?: MedicationSource }) {
  const t = useT();
  if (!source?.url) {
    return (
      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
        {t("Manba tasdiqlanmadi")}
      </span>
    );
  }
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline shrink-0"
      title={`Manba: ${source.provider} (${source.last_updated || ""})`}
    >
      {source.provider}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function MedicationDetailClient({ info, drugName, medicationId }: Props) {
  const t = useT();
  if (!info) {
    return (
      <div className="px-4 py-8 text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center">
          <Pill className="h-8 w-8 text-slate-300" />
        </div>
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
          {t("Bu dori bo'yicha ishonchli ma'lumot topilmadi")}
        </p>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          {t("\"")}{drugName}{t("\" bo'yicha rasmiy DailyMed va openFDA bazalaridan tasdiqlangan ma'lumot topilmadi.")}
        </p>
        <Disclaimer className="mt-4 text-left" />
      </div>
    );
  }

  const isSourceVerified =
    Boolean(info.source?.url) && info.source_verified !== false;

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Unverified source alert if source is missing */}
      {!isSourceVerified && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t("Manba tasdiqlanmadi")}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {t("Ushbu dori bo'yicha rasmiy manba havolasi to'liq tasdiqlanmagan. Shifokor yoki farmatsevt bilan maslahatlashing.")}
            </p>
          </div>
        </div>
      )}

      {/* Header card */}
      <Card className="bg-gradient-to-br from-primary-500 to-violet-500 border-0">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Pill className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">{info.drug_name}</h2>
              {info.generic_name && info.generic_name !== info.drug_name && (
                <p className="text-sm text-white/80 mt-0.5">
                  {t("Generik nom:")} {info.generic_name}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {info.form && (
                  <Badge className="bg-white/20 text-white border-0 text-xs">
                    {info.form}
                  </Badge>
                )}
                {info.dosage && (
                  <Badge className="bg-white/20 text-white border-0 text-xs">
                    {info.dosage}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {info.purpose && (
            <div className="mt-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <p className="text-xs text-white/70 mb-0.5">{t("Nima uchun ishlatiladi")}</p>
              <p className="text-sm text-white leading-relaxed">{info.purpose}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Disclaimer compact />

      {/* How to take */}
      {info.how_to_take && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-primary-500" />
              {t("Qanday ichiladi")}
            </CardTitle>
            <CardSourceLink source={info.source} />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {info.how_to_take}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timing + frequency + dosage */}
      {(info.timing || info.frequency || info.dosage) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-violet-500" />
              {t("Qachon ichiladi va doza o'lchovi")}
            </CardTitle>
            <CardSourceLink source={info.source} />
          </CardHeader>
          <CardContent className="space-y-2">
            {info.timing && (
              <p className="text-sm text-slate-600 dark:text-slate-300">{info.timing}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {info.frequency && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                  <span className="text-xs font-medium text-violet-700 dark:text-violet-400">
                    {t("Kuniga:")} {info.frequency}
                  </span>
                </div>
              )}
              {info.dosage && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                  <span className="text-xs font-medium text-primary-700 dark:text-primary-400">
                    {t("Doza:")} {info.dosage}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Food rule */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Utensils className="h-4 w-4 text-emerald-500" />
            {t("Ovqat bilan yoki bo'sh qorin")}
          </CardTitle>
          <CardSourceLink source={info.source} />
        </CardHeader>
        <CardContent>
          <div
            className={`flex items-center gap-3 p-3 rounded-xl ${
              info.food_rule === "ovqat_bilan"
                ? "bg-emerald-50 dark:bg-emerald-900/20"
                : info.food_rule === "bosh_qorin"
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : "bg-slate-50 dark:bg-slate-700"
            }`}
          >
            {info.food_rule === "ovqat_bilan" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            ) : info.food_rule === "bosh_qorin" ? (
              <XCircle className="h-5 w-5 text-blue-500 shrink-0" />
            ) : (
              <Info className="h-5 w-5 text-slate-400 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-white">
                {info.food_rule === "ovqat_bilan"
                  ? t("Ovqat bilan iching")
                  : info.food_rule === "bosh_qorin"
                    ? t("Bo'sh qorinda iching")
                    : t("Ovqat bilan yoki bo'sh qorinda")}
              </p>
              {info.food_rule_note && (
                <p className="text-xs text-slate-500 mt-0.5">{info.food_rule_note}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missed dose */}
      {info.missed_dose && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-amber-500" />
              {t("Dozani o'tkazib yuborsangiz")}
            </CardTitle>
            <CardSourceLink source={info.source} />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {info.missed_dose}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Common side effects */}
      {info.common_side_effects?.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4 text-pink-500" />
              {t("Umumiy nojo'ya ta'sirlar")}
            </CardTitle>
            <CardSourceLink source={info.source} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {info.common_side_effects.map((effect, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  {effect}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Serious warnings */}
      {info.serious_warnings?.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {t("Ehtiyot bo'ling (Jadval ogohlantirishlari)")}
            </CardTitle>
            <CardSourceLink source={info.source} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {info.serious_warnings.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Lifestyle warnings */}
      {info.lifestyle_warnings &&
        Object.values(info.lifestyle_warnings).some(Boolean) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                {t("Maxsus holatlarda ehtiyot bo'ling")}
              </CardTitle>
              <CardSourceLink source={info.source} />
            </CardHeader>
            <CardContent className="space-y-2">
              {info.lifestyle_warnings.alcohol && (
                <LifestyleItem
                  icon="🍷"
                  label={t("Spirt")}
                  value={info.lifestyle_warnings.alcohol}
                />
              )}
              {info.lifestyle_warnings.pregnancy && (
                <LifestyleItem
                  icon="🤰"
                  label={t("Homiladorlik")}
                  value={info.lifestyle_warnings.pregnancy}
                />
              )}
              {info.lifestyle_warnings.breastfeeding && (
                <LifestyleItem
                  icon="🤱"
                  label={t("Emizish")}
                  value={info.lifestyle_warnings.breastfeeding}
                />
              )}
              {info.lifestyle_warnings.driving && (
                <LifestyleItem
                  icon="🚗"
                  label={t("Haydash")}
                  value={info.lifestyle_warnings.driving}
                />
              )}
              {info.lifestyle_warnings.liver && (
                <LifestyleItem
                  icon="🫀"
                  label={t("Jigar")}
                  value={info.lifestyle_warnings.liver}
                />
              )}
              {info.lifestyle_warnings.kidney && (
                <LifestyleItem
                  icon="🫘"
                  label={t("Buyrak")}
                  value={info.lifestyle_warnings.kidney}
                />
              )}
            </CardContent>
          </Card>
        )}

      {/* Avoid with */}
      {info.avoid_with?.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-red-500" />
              {t("Boshqa dorilar bilan ehtiyot bo'ling")}
            </CardTitle>
            <CardSourceLink source={info.source} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {info.avoid_with.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* When to call doctor */}
      {info.when_to_call_doctor?.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <Phone className="h-4 w-4" />
              {t("Qachon darhol shifokorga murojaat qilish kerak")}
            </CardTitle>
            <CardSourceLink source={info.source} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {info.when_to_call_doctor.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <Phone className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Official Source Footer */}
      {info.source && info.source.url ? (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500">{t("Rasmiy manba")}</p>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {info.source.provider}{" "}
              {info.source.setid ? `(SPL SetID: ${info.source.setid})` : ""}
            </p>
            {info.source.last_updated && (
              <p className="text-[11px] text-slate-400">
                {t("Oxirgi yangilanish sanasi:")} {info.source.last_updated}
              </p>
            )}
          </div>
          <a
            href={info.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {t("Manbani ochish")}
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-300">
          {t("Manba tasdiqlanmadi")}
        </div>
      )}

      <Disclaimer />

      {/* Add reminder CTA */}
      <div className="pb-4">
        <Link
          href={`/reminders/add?medName=${encodeURIComponent(info.drug_name)}&medId=${medicationId ?? ""}`}
        >
          <Button variant="gradient" size="xl" className="w-full">
            <Bell className="h-5 w-5" />
            {t("Eslatma qo'shish")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function LifestyleItem({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
      <span className="text-base shrink-0">{icon}</span>
      <div>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

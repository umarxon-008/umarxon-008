"use client";

import { useT, useLocale } from "@/i18n/client";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { formatDate } from "@/lib/utils";
import type { LabReportAIResult, LabMarker } from "@/types";

interface Props {
  report: {
    id: string;
    fileName: string;
    hasUrgentValues: boolean;
    createdAt: string;
  };
  aiResult: LabReportAIResult;
}

export function LabReportDetailClient({ report, aiResult }: Props) {
  const locale = useLocale();
  const t = useT();
  const hasData = aiResult?.markers?.length > 0 || aiResult?.summary;

  if (!hasData) {
    return (
      <div className="px-4 py-8 text-center space-y-3">
        <HelpCircle className="h-12 w-12 text-slate-200 mx-auto" />
        <p className="text-sm text-slate-500">
          {t("Tahlil natijalari yuklanmadi yoki xatolik yuz berdi")}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Header + Download button */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-400">{formatDate(report.createdAt, locale)}</p>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white mt-0.5">
            {report.fileName}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/lab-reports/${report.id}?download=true`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              {t("Yuklab olish")}
            </Button>
          </a>
        </div>
      </div>

      {/* Urgent red warning */}
      {report.hasUrgentValues && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              {t("Bu natija shifokor bilan tezroq muhokama qilinishi kerak.")}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
              {t("Ba'zi ko'rsatkichlar normal diapazondan sezilarli darajada farq qilmoqda.")}
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      {aiResult.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary-500" />
              {t("AI izohi (Umumiy xulosa)")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {aiResult.summary}
            </p>
          </CardContent>
        </Card>
      )}

      <Disclaimer compact />

      {/* Markers */}
      {aiResult.markers?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            {t("Ko'rsatkichlar (")}{aiResult.markers.length})
          </p>
          <div className="space-y-2.5">
            {aiResult.markers.map((marker, i) => (
              <MarkerCard key={i} marker={marker} />
            ))}
          </div>
        </div>
      )}

      {/* Key points */}
      {aiResult.key_points?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("Muhim nuqtalar")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiResult.key_points.map((pt, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
                  {pt}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Questions for doctor */}
      {aiResult.questions_for_doctor?.length > 0 && (
        <Card className="border-primary-100 dark:border-primary-900">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-primary-700 dark:text-primary-400">
              <MessageSquare className="h-4 w-4" />
              {t("Shifokorga beriladigan savollar")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiResult.questions_for_doctor.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-[10px] font-bold text-primary-700 dark:text-primary-400">
                    {i + 1}
                  </span>
                  {q}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Source */}
      {aiResult.source && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
          <div>
            <p className="text-xs text-slate-400">{t("Tahlil manbasi")}</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {aiResult.source.provider}
            </p>
          </div>
          {aiResult.source.url && (
            <a
              href={aiResult.source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 text-primary-500" />
            </a>
          )}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}

function MarkerCard({ marker }: { marker: LabMarker }) {
  const t = useT();
  const statusConfig = {
    normal: {
      icon: <Minus className="h-4 w-4 text-green-500" />,
      badge: <Badge variant="normal">{t("Normal")}</Badge>,
      bg: "bg-green-50 dark:bg-green-900/10",
    },
    low: {
      icon: <TrendingDown className="h-4 w-4 text-blue-500" />,
      badge: <Badge variant="low">{t("Past")}</Badge>,
      bg: "bg-blue-50 dark:bg-blue-900/10",
    },
    high: {
      icon: <TrendingUp className="h-4 w-4 text-red-500" />,
      badge: <Badge variant="high">{t("Yuqori")}</Badge>,
      bg: "bg-red-50 dark:bg-red-900/10",
    },
    unknown: {
      icon: <HelpCircle className="h-4 w-4 text-slate-400" />,
      badge: <Badge variant="outline">{t("Noma'lum")}</Badge>,
      bg: "bg-slate-50 dark:bg-slate-800",
    },
  };

  const config = statusConfig[marker.status] || statusConfig.unknown;

  return (
    <div
      className={`rounded-xl p-4 ${config.bg} ${
        marker.isUrgent ? "ring-2 ring-red-400 dark:ring-red-600" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {config.icon}
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              {marker.uzbekName || marker.name}
            </p>
            {marker.uzbekName && marker.name !== marker.uzbekName && (
              <p className="text-[10px] text-slate-400">{t(marker.name)}</p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-slate-800 dark:text-white">
            {marker.value}{" "}
            <span className="text-xs font-normal text-slate-400">
              {marker.unit}
            </span>
          </p>
          {config.badge}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-slate-400">{t("Normal diapazon:")}</span>
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {t(marker.normalRange.text)}
        </span>
      </div>

      {marker.explanation && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {marker.explanation}
        </p>
      )}

      {marker.doctorQuestion && (
        <div className="mt-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700">
          <p className="text-[11px] font-medium text-primary-700 dark:text-primary-400">
            {t("Shifokorga savol: “")}{marker.doctorQuestion}{t("”")}
          </p>
        </div>
      )}

      {marker.isUrgent && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          {t("Bu natija shifokor bilan tezroq muhokama qilinishi kerak.")}
        </div>
      )}
    </div>
  );
}

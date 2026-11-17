"use client";

import { useT, useLocale } from "@/i18n/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Scan, ChevronRight, Calendar, Loader2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { Disclaimer } from "@/components/ui/disclaimer";
import { formatDate } from "@/lib/utils";

interface ReportItem {
  id: string;
  fileName: string | null;
  reportType: string | null;
  createdAt: string;
}

const reportTypes = [
  { value: "X-Ray", label: "X-Ray (Rentgen)" },
  { value: "MRI", label: "MRI" },
  { value: "CT", label: "CT skan" },
  { value: "Ultrasound", label: "Ultratovush" },
  { value: "Other", label: "Boshqa" },
];

export function ImagingClient({ reports: initial }: { reports: ReportItem[] }) {
  const locale = useLocale();
  const t = useT();
  const [reports] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState("X-Ray");
  const router = useRouter();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("reportType", reportType);

    try {
      const res = await fetch("/api/imaging-reports", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuklashda xatolik");
      router.push(`/imaging-reports/${data.data.id}`);
    } catch (err) {
      setError(t(err instanceof Error ? err.message : "Xatolik yuz berdi"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Info box */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 dark:text-blue-300">
          {t("NeuraMed rentgen rasmini tashxis")} <strong>{t("qilmaydi")}</strong>{t(". Faqat hisobotdagi tibbiy atamalarni oddiy tilda tushuntiradi.")}
        </p>
      </div>

      <Disclaimer compact />

      {/* Report type selector */}
      <div>
        <label className="label-base">{t("Hisobot turi")}</label>
        <div className="flex gap-2 flex-wrap mt-1">
          {reportTypes.map((it) => (
            <button
              key={it.value}
              type="button"
              onClick={() => setReportType(it.value)}
              className={`text-xs px-3 py-1.5 rounded-full border-2 transition-all font-medium ${
                reportType === it.value
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                  : "border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary-300"
              }`}
            >
              {t(it.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Upload */}
      {uploading ? (
        <div className="flex flex-col items-center gap-3 p-10 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 dark:bg-primary-900/20">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">{t("Hisobot tahlil qilinmoqda...")}</p>
          <p className="text-xs text-slate-400">{t("Atamalar tushuntirilmoqda")}</p>
        </div>
      ) : (
        <FileUpload
          onFileSelect={handleUpload}
          label={t("Hisobotni yuklang")}
          sublabel="PDF, JPG, PNG — Rentgen / MRI / CT hisoboti"
        />
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Reports list */}
      {reports.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            {t("O'tgan hisobotlar")}
          </p>
          <div className="space-y-2">
            {reports.map((r) => (
              <Link key={r.id} href={`/imaging-reports/${r.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                      <Scan className="h-5 w-5 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                        {r.fileName || t("Tasviriy hisobot")}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded-md bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-[10px] font-medium">
                          {r.reportType || t("Hisobot")}
                        </span>
                        <Calendar className="h-3 w-3 ml-1" />
                        {formatDate(r.createdAt, locale)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

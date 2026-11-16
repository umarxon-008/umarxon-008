"use client";

import { useT, useLocale } from "@/i18n/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Upload, AlertTriangle, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import { Disclaimer } from "@/components/ui/disclaimer";
import { formatDate } from "@/lib/utils";

interface ReportItem {
  id: string;
  fileName: string | null;
  hasUrgentValues: boolean;
  createdAt: string;
}

export function LabReportsClient({ reports: initial }: { reports: ReportItem[] }) {
  const locale = useLocale();
  const t = useT();
  const [reports, setReports] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/lab-reports", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yuklashda xatolik");
      router.push(`/lab-reports/${data.data.id}`);
    } catch (err) {
      setError(t(err instanceof Error ? err.message : "Xatolik yuz berdi"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 py-5 space-y-5">
      <Disclaimer compact />

      {/* Upload area */}
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          {t("Yangi tahlil yuklash")}
        </p>
        {uploading ? (
          <div className="flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50 dark:bg-primary-900/20">
            <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
            <p className="text-sm text-primary-600 font-medium">{t("Tahlil tahlil qilinmoqda...")}</p>
            <p className="text-xs text-slate-400">{t("Bu bir necha daqiqa olishi mumkin")}</p>
          </div>
        ) : (
          <FileUpload
            onFileSelect={handleUpload}
            label={t("Tahlil natijasini yuklang")}
            sublabel="PDF, JPG, PNG — Laboratoriya hisoboti"
          />
        )}
        {error && (
          <div className="mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Reports list */}
      {reports.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            {t("O'tgan tahlillar")}
          </p>
          <div className="space-y-2">
            {reports.map((r) => (
              <Link key={r.id} href={`/lab-reports/${r.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${r.hasUrgentValues ? "bg-red-50 dark:bg-red-900/30" : "bg-blue-50 dark:bg-blue-900/30"}`}>
                      <FlaskConical className={`h-5 w-5 ${r.hasUrgentValues ? "text-red-500" : "text-blue-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                        {r.fileName || t("Laboratoriya tahlili")}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(r.createdAt, locale)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.hasUrgentValues && (
                        <Badge variant="high">
                          <AlertTriangle className="h-3 w-3" />
                          {t("Urgent")}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 space-y-3">
          <FlaskConical className="h-12 w-12 text-slate-200 mx-auto" />
          <p className="text-sm text-slate-400">{t("Hozircha tahlil yo'q")}</p>
        </div>
      )}
    </div>
  );
}

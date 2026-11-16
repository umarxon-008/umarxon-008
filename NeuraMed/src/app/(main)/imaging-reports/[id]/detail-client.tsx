"use client";

import { BookOpen, MessageSquare, ArrowRight, HelpCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclaimer } from "@/components/ui/disclaimer";
import { formatDate } from "@/lib/utils";
import type { ImagingReportAIResult } from "@/types";

interface Props {
  report: { id: string; fileName: string; reportType: string; createdAt: string };
  aiResult: ImagingReportAIResult;
}

export function ImagingDetailClient({ report, aiResult }: Props) {
  const hasData = aiResult?.summary || aiResult?.terms_explained?.length > 0;

  if (!hasData) {
    return (
      <div className="px-4 py-8 text-center space-y-3">
        <HelpCircle className="h-12 w-12 text-slate-200 mx-auto" />
        <p className="text-sm text-slate-500">Hisobot ma&apos;lumotlari yuklanmadi</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium">
            {report.reportType}
          </span>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white mt-1">
            {report.fileName}
          </h2>
          <p className="text-xs text-slate-400">{formatDate(report.createdAt)}</p>
        </div>
      </div>

      {/* Important note */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 dark:text-blue-300">
          Bu tushuntirish faqat atamalar haqida umumiy ma&apos;lumot. Hisobotni mutaxassis
          radiolog yoki shifokor bilan muhokama qiling.
        </p>
      </div>

      <Disclaimer compact />

      {/* Summary */}
      {aiResult.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-500" />
              Hisobot xulosasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {aiResult.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Terms explained */}
      {aiResult.terms_explained?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
            Tushuntirilgan atamalar
          </p>
          <div className="space-y-2.5">
            {aiResult.terms_explained.map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-soft"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 shrink-0">
                    {item.term}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                  {item.simple_explanation}
                </p>
                {item.context && (
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.context}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key findings */}
      {aiResult.key_findings?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Asosiy topilmalar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiResult.key_findings.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <ArrowRight className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      {aiResult.questions_for_doctor?.length > 0 && (
        <Card className="border-primary-100 dark:border-primary-900">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-primary-700 dark:text-primary-400">
              <MessageSquare className="h-4 w-4" />
              Shifokorga savollar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiResult.questions_for_doctor.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
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

      {/* Next steps */}
      {aiResult.next_steps?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Keyingi qadamlar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiResult.next_steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="h-5 w-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Disclaimer />
    </div>
  );
}

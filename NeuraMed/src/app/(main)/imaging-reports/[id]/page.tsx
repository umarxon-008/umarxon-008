import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { ImagingDetailClient } from "./detail-client";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";
import type { ImagingReportAIResult } from "@/types";

export default async function ImagingDetailPage({ params }: { params: { id: string } }) {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");

  const report = await prisma.imagingReport.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!report) notFound();

  const aiResult = parseJsonSafe<ImagingReportAIResult>(
    report.aiExplanationJson,
    {} as ImagingReportAIResult
  );

  return (
    <>
      <TopBar title={report.fileName || t("Hisobot")} showBack backHref="/imaging-reports" />
      <ImagingDetailClient
        report={{
          id: report.id,
          fileName: report.fileName ?? "Hisobot",
          reportType: report.reportType ?? "Tasviriy",
          createdAt: report.createdAt.toISOString(),
        }}
        aiResult={aiResult}
      />
    </>
  );
}

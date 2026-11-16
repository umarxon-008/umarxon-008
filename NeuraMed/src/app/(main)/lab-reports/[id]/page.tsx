import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { LabReportDetailClient } from "./detail-client";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";
import type { LabReportAIResult } from "@/types";

export default async function LabReportDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");

  const report = await prisma.labReport.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!report) notFound();

  const aiResult = parseJsonSafe<LabReportAIResult>(
    report.aiExplanationJson,
    {} as LabReportAIResult
  );

  return (
    <>
      <TopBar
        title={report.fileName || t("Tahlil natijasi")}
        showBack
        backHref="/lab-reports"
      />
      <LabReportDetailClient
        report={{
          id: report.id,
          fileName: report.fileName ?? "Tahlil",
          hasUrgentValues: report.hasUrgentValues,
          createdAt: report.createdAt.toISOString(),
        }}
        aiResult={aiResult}
      />
    </>
  );
}

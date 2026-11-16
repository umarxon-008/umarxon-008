import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { ImagingClient } from "./imaging-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ImagingReportsPage() {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");

  const reports = await prisma.imagingReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, reportType: true, createdAt: true },
  });

  return (
    <>
      <TopBar title={t("Rentgen va tasviriy hisobotlar")} />
      <ImagingClient
        reports={reports.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}

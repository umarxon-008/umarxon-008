import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LabHub } from "./lab-hub";

/** Tahlillar: laboratoriya tahlillari va rentgen/tasviriy hisobotlar bitta sahifada. */
export default async function LabReportsPage({ searchParams }: { searchParams: { tab?: string } }) {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");

  const [labs, imaging] = await Promise.all([
    prisma.labReport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, hasUrgentValues: true, createdAt: true },
    }),
    prisma.imagingReport.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true, reportType: true, createdAt: true },
    }),
  ]);

  return (
    <>
      <TopBar title={t("Tahlillar")} />
      <LabHub
        initialTab={searchParams.tab}
        labs={labs.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        imaging={imaging.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
      />
    </>
  );
}

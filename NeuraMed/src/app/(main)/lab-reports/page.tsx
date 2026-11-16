import { TopBar } from "@/components/layout/top-bar";
import { LabReportsClient } from "./lab-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function LabReportsPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const reports = await prisma.labReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      hasUrgentValues: true,
      createdAt: true,
    },
  });

  return (
    <>
      <TopBar title="Laboratoriya tahlillari" />
      <LabReportsClient
        reports={reports.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}

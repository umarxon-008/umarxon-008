import { TopBar } from "@/components/layout/top-bar";
import { DoctorVisitClient } from "./doctor-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";

export default async function DoctorVisitPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const preps = await prisma.doctorVisitPrep.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      symptomsJson: true,
      urgencyLevel: true,
      createdAt: true,
    },
  });

  return (
    <>
      <TopBar title="Shifokor qabuliga tayyorlanish" />
      <DoctorVisitClient
        pastPreps={preps.map((p) => ({
          id: p.id,
          symptoms: parseJsonSafe<string[]>(p.symptomsJson, []),
          urgencyLevel: p.urgencyLevel,
          createdAt: p.createdAt.toISOString(),
        }))}
      />
    </>
  );
}

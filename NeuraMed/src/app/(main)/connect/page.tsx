import { getT } from "@/i18n/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { ConnectClient } from "./connect-client";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("MEDCONNECT") };
}

export default async function ConnectPage({ searchParams }: { searchParams: { tab?: string } }) {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");
  const preps: any[] = await prisma.doctorVisitPrep.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 });
  const pastPreps = preps.map((p) => ({ id: p.id, symptoms: parseJsonSafe<string[]>(p.symptomsJson, []), urgencyLevel: p.urgencyLevel, createdAt: new Date(p.createdAt).toISOString() }));
  return (
    <>
      <TopBar title={t("MEDCONNECT")} />
      <ConnectClient initialTab={searchParams.tab} userName={user.name || ""} pastPreps={pastPreps} />
    </>
  );
}

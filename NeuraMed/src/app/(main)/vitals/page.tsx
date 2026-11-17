import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { VitalsClient } from "./vitals-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Koʻrsatkichlar") };
}

export default async function VitalsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const t = await getT();
  return (
    <>
      <TopBar title={t("Koʻrsatkichlar")} />
      <VitalsClient />
    </>
  );
}

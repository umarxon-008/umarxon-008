import { getT } from "@/i18n/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { StockClient } from "./stock-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("MEDSTOCK AI") };
}

export default async function StockPage() {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title={t("MEDSTOCK AI")} />
      <StockClient />
    </>
  );
}

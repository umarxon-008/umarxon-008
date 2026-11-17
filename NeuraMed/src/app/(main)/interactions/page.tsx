import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { InteractionsClient } from "./interactions-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Dorilar mosligi") };
}

export default async function InteractionsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const t = await getT();
  return (
    <>
      <TopBar title={t("Dorilar mosligi")} />
      <InteractionsClient />
    </>
  );
}

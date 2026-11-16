import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { MedicationSearchClient } from "./search-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MedicationSearchPage() {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title={t("Dori qidirish")} showBack backHref="/dashboard" />
      <MedicationSearchClient />
    </>
  );
}

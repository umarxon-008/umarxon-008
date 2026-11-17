import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { MedcardClient } from "./medcard-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Tibbiy karta (QR)") };
}

export default async function MedcardPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const t = await getT();
  return (
    <>
      <TopBar title={t("Tibbiy karta (QR)")} />
      <MedcardClient />
    </>
  );
}

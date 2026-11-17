import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { SosClient } from "./sos-client";

export const metadata = { title: "SOS" };

export default async function SosPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const t = await getT();
  return (
    <>
      <TopBar title={t("SOS — shoshilinch yordam")} />
      <SosClient />
    </>
  );
}

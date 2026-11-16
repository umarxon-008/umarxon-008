import { getT } from "@/i18n/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { ConnectClient } from "./connect-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("MEDCONNECT") };
}

export default async function ConnectPage({ searchParams }: { searchParams: { tab?: string } }) {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title={t("MEDCONNECT")} />
      <ConnectClient initialTab={searchParams.tab} userName={user.name || ""} />
    </>
  );
}

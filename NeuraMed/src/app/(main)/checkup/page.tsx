import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { CheckupHub } from "./checkup-hub";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Chekap") };
}

export default async function CheckupPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const t = await getT();
  return (
    <>
      <TopBar title={t("Chekap")} />
      <CheckupHub initialTab={searchParams.tab} />
    </>
  );
}

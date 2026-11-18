import { getT } from "@/i18n/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TraceClient } from "./trace-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("PHARMA TRACE") };
}

export default async function TracePage() {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TraceClient />
    </>
  );
}

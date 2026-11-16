import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { TraceClient } from "./trace-client";

export const metadata = { title: "PHARMA TRACE" };

export default async function TracePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title="PHARMA TRACE" />
      <TraceClient />
    </>
  );
}

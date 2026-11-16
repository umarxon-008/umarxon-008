import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { StockClient } from "./stock-client";

export const metadata = { title: "MEDSTOCK AI" };

export default async function StockPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title="MEDSTOCK AI" />
      <StockClient />
    </>
  );
}

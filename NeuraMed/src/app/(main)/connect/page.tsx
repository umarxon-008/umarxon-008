import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { ConnectClient } from "./connect-client";

export const metadata = { title: "MEDCONNECT" };

export default async function ConnectPage({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title="MEDCONNECT" />
      <ConnectClient initialTab={searchParams.tab} userName={user.name || ""} />
    </>
  );
}

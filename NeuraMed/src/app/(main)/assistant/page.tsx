import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { isAIEnabled } from "@/lib/ai";
import { AssistantClient } from "./assistant-client";

export const metadata = { title: "MEDAI yordamchi" };

export default async function AssistantPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title="MEDAI — AI yordamchi" />
      <AssistantClient aiEnabled={isAIEnabled()} />
    </>
  );
}

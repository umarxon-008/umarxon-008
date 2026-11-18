import { getT } from "@/i18n/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isAIEnabled } from "@/lib/ai";
import { AssistantClient } from "./assistant-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("MEDAI yordamchi") };
}

export default async function AssistantPage() {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <AssistantClient aiEnabled={isAIEnabled()} />
    </>
  );
}

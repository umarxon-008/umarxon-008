import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { findProduct, qualityOf, localAnalogs } from "@/lib/modules/trace";
import { isAIEnabled } from "@/lib/ai";
import { getT } from "@/i18n/server";
import { TraceDetail } from "./trace-detail";

export default async function TraceProductPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const p = findProduct(params.id);
  if (!p) notFound();
  return (
    <>
      <TopBar title={(await getT())(p.name)} showBack backHref="/trace" />
      <TraceDetail p={p} quality={qualityOf(p.id)} analogs={localAnalogs(p.id)} aiEnabled={isAIEnabled()} />
    </>
  );
}

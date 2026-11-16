import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { findProduct } from "@/lib/modules/trace";
import { TraceDetail } from "./trace-detail";

export default async function TraceProductPage({ params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const p = findProduct(params.id);
  if (!p) notFound();
  return (
    <>
      <TopBar title={p.name} showBack backHref="/trace" />
      <TraceDetail p={p} />
    </>
  );
}

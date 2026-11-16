import { getT } from "@/i18n/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { libraryTerms, libraryMeta } from "@/lib/medai";
import { LibraryClient } from "./library-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Tibbiy kutubxona") };
}

export default async function LibraryPage() {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title={t("MEDAI — Tibbiy kutubxona")} />
      <LibraryClient terms={libraryTerms} meta={libraryMeta} />
    </>
  );
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { TopBar } from "@/components/layout/top-bar";
import { libraryTerms, libraryMeta } from "@/lib/medai";
import { LibraryClient } from "./library-client";

export const metadata = { title: "Tibbiy kutubxona" };

export default async function LibraryPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <>
      <TopBar title="MEDAI — Tibbiy kutubxona" />
      <LibraryClient terms={libraryTerms} meta={libraryMeta} />
    </>
  );
}

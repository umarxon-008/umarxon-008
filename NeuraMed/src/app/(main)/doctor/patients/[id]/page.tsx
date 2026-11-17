import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { PatientClient } from "./patient-client";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Bemor") };
}

export default async function DoctorPatientPage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "doctor") redirect("/dashboard");
  const t = await getT();
  return (
    <>
      <TopBar title={t("Bemor")} showBack backHref="/doctor" />
      <PatientClient id={params.id} initialTab={searchParams.tab} />
    </>
  );
}

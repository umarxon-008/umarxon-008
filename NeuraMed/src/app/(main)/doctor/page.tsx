import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { DoctorHome } from "./doctor-home";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Shifokor paneli") };
}

export default async function DoctorPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "doctor") redirect("/dashboard");
  const t = await getT();
  return (
    <>
      <TopBar title={t("Shifokor paneli")} />
      <DoctorHome name={user.name || ""} specialty={user.specialty || ""} />
    </>
  );
}

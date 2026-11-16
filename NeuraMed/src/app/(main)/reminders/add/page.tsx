import { getT } from "@/i18n/server";
import { TopBar } from "@/components/layout/top-bar";
import { AddReminderClient } from "./add-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

interface Props {
  searchParams: { medName?: string; medId?: string };
}

export default async function AddReminderPage({ searchParams }: Props) {
  const t = await getT();
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <>
      <TopBar title={t("Eslatma qo'shish")} showBack backHref="/reminders" />
      <AddReminderClient
        defaultMedName={searchParams.medName}
        defaultMedId={searchParams.medId}
      />
    </>
  );
}

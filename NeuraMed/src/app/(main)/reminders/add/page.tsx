import { TopBar } from "@/components/layout/top-bar";
import { AddReminderClient } from "./add-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

interface Props {
  searchParams: { medName?: string; medId?: string };
}

export default async function AddReminderPage({ searchParams }: Props) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <>
      <TopBar title="Eslatma qo'shish" showBack backHref="/reminders" />
      <AddReminderClient
        defaultMedName={searchParams.medName}
        defaultMedId={searchParams.medId}
      />
    </>
  );
}

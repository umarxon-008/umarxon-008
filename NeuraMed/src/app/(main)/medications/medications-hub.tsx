"use client";

import * as React from "react";
import { Pill, Search, ShieldPlus } from "lucide-react";
import { Tabs } from "@/components/modules/tabs";
import { RemindersClient } from "@/components/care/my-medications";
import { MedicationSearchClient } from "@/components/care/medication-search";
import { InteractionsClient } from "@/components/care/interactions";
import type { ReminderWithMed } from "@/types";

type Tab = "mine" | "search" | "interactions";

export function MedicationsHub({ initialTab, reminders }: { initialTab?: string; reminders: ReminderWithMed[] }) {
  const [tab, setTab] = React.useState<Tab>(initialTab === "search" || initialTab === "interactions" ? initialTab : "mine");
  return (
    <div className="px-4 py-4 space-y-4">
      <Tabs<Tab> value={tab} onChange={setTab} items={[
        { id: "mine", label: "Mening dorilarim", icon: Pill, badge: reminders.filter((r) => (r.status as string) === "ACTIVE").length },
        { id: "search", label: "Dori qidirish", icon: Search },
        { id: "interactions", label: "Mosligi", icon: ShieldPlus },
      ]} />
      {tab === "mine" && <RemindersClient reminders={reminders} />}
      {tab === "search" && <MedicationSearchClient />}
      {tab === "interactions" && <InteractionsClient />}
    </div>
  );
}

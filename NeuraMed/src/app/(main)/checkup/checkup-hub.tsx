"use client";

import * as React from "react";
import { HeartPulse, Activity } from "lucide-react";
import { useT } from "@/i18n/client";
import { ModuleHero } from "@/components/modules/common";
import { Tabs } from "@/components/modules/tabs";
import { CheckupPanel } from "@/components/care/checkup-panel";
import { VitalsPanel } from "@/components/care/vitals-panel";

/** Chekap = shifokor o'tkazgan so'rovnoma natijasi + shifokor kiritgan ko'rsatkichlar. Bemor faqat ko'radi. */
export function CheckupHub({ initialTab }: { initialTab?: string }) {
  const t = useT();
  const [tab, setTab] = React.useState(initialTab === "vitals" ? "vitals" : "result");
  return (
    <div className="px-4 py-4 space-y-4">
      <ModuleHero icon={HeartPulse} name="Salomatligim" title={t("Chekap — shifokor oʻtkazadi")} text="Shifokoringiz qabulda chekap oʻtkazadi va koʻrsatkichlarni kiritadi. Bu yerda salomatlik balli, shifokor xulosasi va dinamikani koʻrasiz." />
      <Tabs value={tab} onChange={setTab} items={[{ id: "result", label: "Chekap natijasi", icon: HeartPulse }, { id: "vitals", label: "Koʻrsatkichlar", icon: Activity }]} />
      {tab === "result" ? <CheckupPanel /> : <VitalsPanel />}
    </div>
  );
}

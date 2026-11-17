"use client";

import * as React from "react";
import { FlaskConical, Scan } from "lucide-react";
import { Tabs } from "@/components/modules/tabs";
import { ImagingClient } from "@/components/care/imaging-list";
import { LabReportsClient } from "./lab-client";

type Lab = React.ComponentProps<typeof LabReportsClient>["reports"];
type Img = React.ComponentProps<typeof ImagingClient>["reports"];

export function LabHub({ initialTab, labs, imaging }: { initialTab?: string; labs: Lab; imaging: Img }) {
  const [tab, setTab] = React.useState(initialTab === "imaging" ? "imaging" : "lab");
  return (
    <div className="px-4 py-4 space-y-4">
      <Tabs value={tab} onChange={setTab} items={[
        { id: "lab", label: "Laboratoriya tahlillari", icon: FlaskConical, badge: labs.length },
        { id: "imaging", label: "Rentgen va tasvirlar", icon: Scan, badge: imaging.length },
      ]} />
      {tab === "lab" ? <LabReportsClient reports={labs} /> : <ImagingClient reports={imaging} />}
    </div>
  );
}

import { TopBar } from "@/components/layout/top-bar";
import { MedicationDetailClient } from "./detail-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { fetchRawDrugData } from "@/lib/api/drug-sources";
import { explainMedication } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { parseJsonSafe } from "@/lib/utils";
import type { MedicationInfo } from "@/types";

interface Props {
  params: { id: string };
  searchParams: { name?: string };
}

export default async function MedicationDetailPage({ params, searchParams }: Props) {
  const user = await getSession();
  if (!user) redirect("/login");

  const drugName = searchParams.name || params.id;

  let info: MedicationInfo | null = null;
  let medicationId: string | undefined;

  // Check DB cache
  const cached = await prisma.medication.findFirst({
    where: {
      OR: [
        { rxcui: params.id !== "search" ? params.id : undefined },
        { name: { contains: drugName, mode: "insensitive" } },
      ],
    },
  });

  if (cached?.simplifiedInfoJson) {
    info = parseJsonSafe<MedicationInfo>(cached.simplifiedInfoJson, {} as MedicationInfo);
    medicationId = cached.id;
  } else {
    const rawData = await fetchRawDrugData(drugName).catch(() => null);
    if (rawData) {
      info = await explainMedication(rawData).catch(() => null);
      if (info) {
        try {
          const med = await prisma.medication.upsert({
            where: { rxcui: rawData.rxcui ?? `manual-${drugName}` },
            update: { simplifiedInfoJson: JSON.stringify(info) },
            create: {
              name: info.drug_name || drugName,
              genericName: info.generic_name,
              form: info.form,
              rxcui: rawData.rxcui ?? `manual-${drugName}`,
              sourceProvider: rawData.provider,
              sourceSetId: rawData.setid,
              sourceUrl: rawData.sourceUrl,
              lastUpdated: rawData.lastUpdated,
              simplifiedInfoJson: JSON.stringify(info),
            },
          });
          medicationId = med.id;
        } catch {}
      }
    }
  }

  return (
    <>
      <TopBar
        title={info?.drug_name || drugName}
        showBack
        backHref="/medications?tab=search"
      />
      <MedicationDetailClient
        info={info}
        drugName={drugName}
        medicationId={medicationId}
      />
    </>
  );
}

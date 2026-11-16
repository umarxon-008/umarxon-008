import { NextRequest, NextResponse } from "next/server";
import { fetchRawDrugData } from "@/lib/api/drug-sources";
import { explainMedication } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseJsonSafe } from "@/lib/utils";
import type { MedicationInfo } from "@/types";

// GET /api/medications/[id]?name=paracetamol
// id can be rxcui or "search" (use name param)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nameParam = searchParams.get("name")?.trim();
  const drugName = nameParam || params.id;

  if (!drugName) {
    return NextResponse.json({ error: "Dori nomi kerak" }, { status: 400 });
  }

  // Check DB cache first
  const cached = await prisma.medication.findFirst({
    where: {
      OR: [
        { rxcui: params.id !== "search" ? params.id : undefined },
        { name: { contains: drugName, mode: "insensitive" } },
      ],
    },
  });

  if (cached?.simplifiedInfoJson) {
    const info = parseJsonSafe<MedicationInfo>(cached.simplifiedInfoJson, {} as MedicationInfo);
    return NextResponse.json({ data: info, cached: true, medicationId: cached.id });
  }

  // Fetch from APIs
  const rawData = await fetchRawDrugData(drugName);

  if (!rawData) {
    return NextResponse.json(
      {
        error: "Bu dori bo'yicha ishonchli ma'lumot topilmadi",
        notFound: true,
      },
      { status: 404 }
    );
  }

  // AI explanation
  const info = await explainMedication(rawData);

  if (!info) {
    return NextResponse.json(
      {
        error: "Dori ma'lumotini qayta ishlashda xatolik yuz berdi",
        rawData,
      },
      { status: 500 }
    );
  }

  // Save to DB
  let medicationId: string | undefined;
  try {
    const med = await prisma.medication.upsert({
      where: { rxcui: rawData.rxcui ?? `manual-${drugName}` },
      update: {
        simplifiedInfoJson: JSON.stringify(info),
        rawLabelJson: JSON.stringify(rawData.fdaLabel),
        lastUpdated: rawData.lastUpdated,
        sourceUrl: rawData.sourceUrl,
        sourceSetId: rawData.setid,
        updatedAt: new Date(),
      },
      create: {
        name: info.drug_name || drugName,
        genericName: info.generic_name,
        form: info.form,
        rxcui: rawData.rxcui ?? `manual-${drugName}`,
        sourceProvider: rawData.provider,
        sourceSetId: rawData.setid,
        sourceUrl: rawData.sourceUrl,
        lastUpdated: rawData.lastUpdated,
        rawLabelJson: JSON.stringify(rawData.fdaLabel),
        simplifiedInfoJson: JSON.stringify(info),
      },
    });
    medicationId = med.id;
  } catch (err) {
    // Non-critical — still return info
    console.error("DB save error:", err);
  }

  return NextResponse.json({ data: info, cached: false, medicationId });
}

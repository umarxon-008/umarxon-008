import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { encryptJson, decryptJson } from "@/lib/encryption";
import { parseJsonSafe } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().optional(),
  age: z.number().min(1).max(150).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  heightCm: z.number().optional(),
  weightKg: z.number().optional(),
  allergies: z.array(z.string()).optional(),
  chronicConditions: z.array(z.string()).optional(),
  currentMedications: z.array(z.string()).optional(),
  pregnancyStatus: z
    .enum(["NOT_APPLICABLE", "PREGNANT", "BREASTFEEDING", "PLANNING"])
    .optional(),
  emergencyContact: z
    .object({ name: z.string(), phone: z.string() })
    .optional(),
  language: z.enum(["uz", "ru", "en"]).optional(),
});

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  const isExport = req.nextUrl.searchParams.get("export") === "true";

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      age: true,
      gender: true,
      heightCm: true,
      weightKg: true,
      allergiesJson: true,
      chronicConditionsJson: true,
      currentMedicationsJson: true,
      pregnancyStatus: true,
      emergencyContact: true,
      language: true,
    },
  });

  if (!dbUser) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const decryptField = (val: string | null) => {
    if (!val) return [];
    try { return decryptJson<string[]>(val); } catch { return parseJsonSafe<string[]>(val, []); }
  };

  const decryptContact = (val: string | null) => {
    if (!val) return undefined;
    try { return decryptJson<{ name: string; phone: string }>(val); } catch { return parseJsonSafe<{ name: string; phone: string } | undefined>(val, undefined); }
  };

  const profileData = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    phone: dbUser.phone,
    age: dbUser.age,
    gender: dbUser.gender,
    heightCm: dbUser.heightCm,
    weightKg: dbUser.weightKg,
    allergies: decryptField(dbUser.allergiesJson),
    chronicConditions: decryptField(dbUser.chronicConditionsJson),
    currentMedications: decryptField(dbUser.currentMedicationsJson),
    pregnancyStatus: dbUser.pregnancyStatus,
    emergencyContact: decryptContact(dbUser.emergencyContact),
    language: dbUser.language,
  };

  if (isExport) {
    const [reminders, labReports, imagingReports, doctorVisitPreps] =
      await Promise.all([
        prisma.reminder.findMany({
          where: { userId: user.id },
          include: { doseLogs: true },
        }),
        prisma.labReport.findMany({ where: { userId: user.id } }),
        prisma.imagingReport.findMany({ where: { userId: user.id } }),
        prisma.doctorVisitPrep.findMany({ where: { userId: user.id } }),
      ]);

    return new NextResponse(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          platform: "NeuraMed",
          profile: profileData,
          reminders,
          labReports,
          imagingReports,
          doctorVisitPreps,
        },
        null,
        2
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="neuramed-export-${user.id}.json"`,
        },
      }
    );
  }

  return NextResponse.json({
    data: profileData,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json();
  const data = updateSchema.parse(body);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      age: data.age,
      gender: data.gender,
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      allergiesJson: data.allergies ? encryptJson(data.allergies) : undefined,
      chronicConditionsJson: data.chronicConditions
        ? encryptJson(data.chronicConditions)
        : undefined,
      currentMedicationsJson: data.currentMedications
        ? encryptJson(data.currentMedications)
        : undefined,
      pregnancyStatus: data.pregnancyStatus,
      emergencyContact: data.emergencyContact
        ? encryptJson(data.emergencyContact)
        : undefined,
      language: data.language,
    },
  });

  return NextResponse.json({ ok: true });
}

// DELETE — GDPR data deletion
export async function DELETE() {
  const user = await requireAuth();

  await prisma.$transaction([
    prisma.doseLog.deleteMany({
      where: { reminder: { userId: user.id } },
    }),
    prisma.reminder.deleteMany({ where: { userId: user.id } }),
    prisma.labReport.deleteMany({ where: { userId: user.id } }),
    prisma.imagingReport.deleteMany({ where: { userId: user.id } }),
    prisma.doctorVisitPrep.deleteMany({ where: { userId: user.id } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: "[O'chirilgan]",
        email: null,
        phone: null,
        passwordHash: null,
        allergiesJson: null,
        chronicConditionsJson: null,
        currentMedicationsJson: null,
        emergencyContact: null,
        pushSubscriptionJson: null,
        deletedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

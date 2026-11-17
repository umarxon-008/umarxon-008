import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePatient as requireAuth } from "@/lib/auth";
import { prepareDoctorVisit } from "@/lib/ai";
import { z } from "zod";
import type { DoctorVisitInput } from "@/types";

const schema = z.object({
  symptoms: z.array(z.string()).min(1, "Kamida bitta belgi kiriting"),
  duration: z.string().min(1),
  hasTemperature: z.boolean(),
  temperatureValue: z.string().optional(),
  allergies: z.array(z.string()),
  currentMedications: z.array(z.string()),
  chronicConditions: z.array(z.string()),
  pregnancyNote: z.string().optional(),
  appointmentId: z.string().max(64).optional(),
});

export async function GET() {
  const user = await requireAuth();

  const preps = await prisma.doctorVisitPrep.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      symptomsJson: true,
      urgencyLevel: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: preps });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json();
  const parsed = schema.parse(body);
  const data = parsed as DoctorVisitInput;
  const appt = parsed.appointmentId ? await prisma.appointment.findFirst({ where: { id: parsed.appointmentId, userId: user.id } }) : null;

  const aiResult = await prepareDoctorVisit(data);

  const urgencyLevel = (aiResult?.urgency_level?.toUpperCase() ?? "LOW") as
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "EMERGENCY";

  const prep = await prisma.doctorVisitPrep.create({
    data: {
      userId: user.id,
      symptomsJson: JSON.stringify(data.symptoms),
      duration: data.duration,
      hasTemperature: data.hasTemperature,
      allergiesJson: JSON.stringify(data.allergies),
      currentMedsJson: JSON.stringify(data.currentMedications),
      chronicCondJson: JSON.stringify(data.chronicConditions),
      pregnancyNote: data.pregnancyNote,
      aiResultJson: aiResult ? JSON.stringify(aiResult) : null,
      urgencyLevel,
      appointmentId: appt ? appt.id : null,
    },
  });

  return NextResponse.json({ data: { id: prep.id, aiResult } }, { status: 201 });
}

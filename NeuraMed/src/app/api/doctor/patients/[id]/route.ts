/** Shifokor: bemor sahifasi — profil, tibbiy karta, dorilar, tahlillar, qabulga tayyorlanish. Faqat ruxsat bergan bemor. */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/modules/http";
import { assertPatientAccess } from "@/lib/modules/doctors";
import { activeMedicationNames, getHealthProfile } from "@/lib/modules/health-profile";
import { parseJsonSafe } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const doc = await requireDoctor();
    await assertPatientAccess(doc.doctorRef, params.id);
    const profile = await getHealthProfile(params.id);
    if (!profile) throw new HttpError(404, "Bemor topilmadi");
    const [card, labs, imaging, preps, appts] = await Promise.all([
      prisma.healthCard.findFirst({ where: { userId: params.id } }) as Promise<any>,
      prisma.labReport.findMany({ where: { userId: params.id } }) as Promise<any[]>,
      prisma.imagingReport.findMany({ where: { userId: params.id } }) as Promise<any[]>,
      prisma.doctorVisitPrep.findMany({ where: { userId: params.id } }) as Promise<any[]>,
      prisma.appointment.findMany({ where: { userId: params.id, doctorId: doc.doctorRef } }) as Promise<any[]>,
    ]);
    const byDate = (a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt));
    const mine = new Set(appts.map((a) => a.id));
    return NextResponse.json({
      profile: { name: profile.name, age: profile.age, gender: profile.gender, heightCm: profile.heightCm, weightKg: profile.weightKg, allergies: profile.allergies, chronicConditions: profile.chronicConditions, pregnancyStatus: profile.pregnancyStatus },
      bloodType: card?.bloodType ?? null,
      medications: await activeMedicationNames(params.id, profile.currentMedications),
      appointments: appts.filter((a) => a.status !== "cancelled").map((a) => ({ id: a.id, date: a.date, time: a.time, reason: a.reason ?? null })).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)),
      labs: labs.sort(byDate).slice(0, 10).map((r) => {
        const ai = parseJsonSafe<any>(r.aiExplanationJson, {});
        return { id: r.id, fileName: r.fileName, createdAt: new Date(r.createdAt).toISOString(), urgent: !!r.hasUrgentValues, summary: ai?.summary ?? null, markers: (ai?.markers || []).slice(0, 12).map((m: any) => ({ name: m.uzbekName || m.name, value: m.value, unit: m.unit, status: m.status, range: m.normalRange?.text ?? "" })) };
      }),
      imaging: imaging.sort(byDate).slice(0, 10).map((r) => {
        const ai = parseJsonSafe<any>(r.aiExplanationJson, {});
        return { id: r.id, fileName: r.fileName, type: r.reportType ?? null, createdAt: new Date(r.createdAt).toISOString(), summary: ai?.summary ?? null };
      }),
      preps: preps.sort(byDate).filter((p) => !p.appointmentId || mine.has(p.appointmentId)).slice(0, 5).map((p) => {
        const ai = parseJsonSafe<any>(p.aiResultJson, {});
        return { id: p.id, createdAt: new Date(p.createdAt).toISOString(), symptoms: parseJsonSafe<string[]>(p.symptomsJson, []), duration: p.duration ?? null, urgency: p.urgencyLevel, appointmentId: p.appointmentId ?? null, questions: ai?.questions_for_doctor || ai?.questions || [] };
      }),
    });
  } catch (e) { return apiError(e); }
}

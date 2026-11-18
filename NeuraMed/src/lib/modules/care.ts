/** Chekap va ko'rsatkichlar: tarix, saqlash (faqat shifokor). Server tomonida ishlatiladi. */
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/modules/http";
import { AREAS, QUESTIONS, scoreCheckup } from "@/lib/modules/checkup";
import { assessVital, vitalDef, type VitalType } from "@/lib/modules/vitals";

export interface DoctorStamp { ref: string; name: string }

export async function checkupHistory(userId: string) {
  const list: any[] = await prisma.checkup.findMany({ where: { userId } });
  const notes: any[] = await prisma.checkupNote.findMany({ where: { userId } });
  const history = list
    .map((c) => {
      let extra: ReturnType<typeof scoreCheckup> | null = null;
      try { extra = scoreCheckup(JSON.parse(c.answersJson || "{}")); } catch { extra = null; }
      return {
        id: c.id,
        score: c.score,
        areas: JSON.parse(c.scoresJson || "[]"),
        createdAt: new Date(c.createdAt).toISOString(),
        doctorName: c.doctorName ?? null,
        conclusion: c.conclusion ?? null,
        diagnosis: c.diagnosis ?? null,
        notes: notes
          .filter((n) => n.checkupId === c.id)
          .map((n) => ({ id: n.id, doctorName: n.doctorName, text: n.text, createdAt: new Date(n.createdAt).toISOString() }))
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        flags: extra?.flags ?? [],
        tips: extra?.tips ?? [],
        emergency: extra?.emergency ?? false,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { questions: QUESTIONS, areas: AREAS, history };
}

export async function saveCheckup(patientId: string, body: any, doctor: DoctorStamp) {
  const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};
  let result;
  try { result = scoreCheckup(answers); } catch { throw new HttpError(400, "Barcha savollarga javob bering"); }
  const conclusion = typeof body?.conclusion === "string" ? body.conclusion.trim().slice(0, 1000) : "";
  const diagnosis = typeof body?.diagnosis === "string" ? body.diagnosis.trim().slice(0, 300) : "";
  await prisma.checkup.create({
    data: { userId: patientId, answersJson: JSON.stringify(answers), score: result.score, scoresJson: JSON.stringify(result.areas), doctorRef: doctor.ref, doctorName: doctor.name, conclusion: conclusion || null, diagnosis: diagnosis || null },
  });
  return result;
}

/** Saqlangan chekapga shifokor izohi (bemor bildirishnoma oladi). */
export async function addCheckupNote(patientId: string, body: any, doctor: DoctorStamp) {
  const checkupId = String(body?.checkupId || "");
  const c: any = await prisma.checkup.findFirst({ where: { id: checkupId, userId: patientId } });
  if (!c) throw new HttpError(404, "Chekap topilmadi");
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) throw new HttpError(400, "Izoh boʻsh");
  if (text.length > 1000) throw new HttpError(400, "Izoh 1000 belgidan oshmasligi kerak");
  return prisma.checkupNote.create({ data: { checkupId, userId: patientId, doctorRef: doctor.ref, doctorName: doctor.name, text } });
}

export async function saveVital(patientId: string, body: any, doctor: DoctorStamp) {
  const def = vitalDef(String(body?.type || ""));
  if (!def) throw new HttpError(400, "Koʻrsatkich turini tanlang");
  const value = Number(body?.value);
  if (!Number.isFinite(value) || value < def.min || value > def.max) throw new HttpError(400, "Qiymat ruxsat etilgan oraliqdan tashqarida");
  const history: any[] = (await prisma.vitalReading.findMany({ where: { userId: patientId, type: def.type } })).sort((a: any, c: any) => String(c.at).localeCompare(String(a.at)));
  const u: any = await prisma.user.findUnique({ where: { id: patientId } });
  const assessment = assessVital(def.type as VitalType, value, null, history, u?.heightCm);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 80) : null;
  const rec = await prisma.vitalReading.create({ data: { userId: patientId, type: def.type, value, value2: null, note, doctorRef: doctor.ref, doctorName: doctor.name, at: new Date() } });
  return { data: rec, assessment };
}

export async function deleteVital(patientId: string, readingId: string, doctorRef: string) {
  const r: any = await prisma.vitalReading.findFirst({ where: { id: readingId, userId: patientId } });
  if (!r) throw new HttpError(404, "Oʻlchov topilmadi");
  if (r.doctorRef && r.doctorRef !== doctorRef) throw new HttpError(403, "Faqat oʻzingiz kiritgan oʻlchovni oʻchira olasiz");
  await prisma.vitalReading.delete({ where: { id: readingId } });
}

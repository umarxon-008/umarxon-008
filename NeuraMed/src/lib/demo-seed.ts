/**
 * Demo hisoblar: bemor (test@neuramed.uz) va shifokor (doctor@neuramed.uz).
 * Ikkalasi namunaviy qabul orqali bog'langan, shunda hakatonda ikki tomonni ham ko'rsatish mumkin.
 * Barcha ma'lumotlar NAMUNA — haqiqiy shaxs va haqiqiy tibbiy yozuv emas.
 * Kirishda chaqiriladi; takroriy chaqiruv xavfsiz (faqat yetishmaganini qo'shadi).
 */
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isoDay } from "@/lib/modules/dates";
import { demoVitals } from "@/lib/modules/vitals";
import { QUESTIONS, scoreCheckup } from "@/lib/modules/checkup";

export const DEMO_PATIENT_EMAIL = "test@neuramed.uz";
export const DEMO_DOCTOR_EMAIL = "doctor@neuramed.uz";
export const DEMO_DOCTOR_REF = "d1";
export const DEMO_DOCTOR_NAME = "Dilnoza Rahimova";

export async function ensureDemoData() {
  let doctor: any = await prisma.user.findUnique({ where: { email: DEMO_DOCTOR_EMAIL } });
  if (!doctor) {
    doctor = await prisma.user.create({
      data: {
        id: "usr_neuramed_doctor",
        name: DEMO_DOCTOR_NAME,
        email: DEMO_DOCTOR_EMAIL,
        passwordHash: bcrypt.hashSync("Test12345!", 10),
        role: "doctor",
        specialty: "Terapevt",
        clinicName: "Salomatlik oilaviy poliklinikasi",
        licenseNo: "UZ-LIC-0001",
        workDaysJson: "[1,2,3,4,5]",
        workHoursJson: "[9,17]",
        doctorRef: DEMO_DOCTOR_REF,
        language: "uz",
      },
    });
  }

  const patient: any = await prisma.user.findUnique({ where: { email: DEMO_PATIENT_EMAIL } });
  if (!patient) return;

  // 1. Namunaviy qabul (bugun) — shifokor bemorni "Bemorlarim" ro'yxatida ko'radi
  const today = isoDay(new Date());
  const appts: any[] = await prisma.appointment.findMany({ where: { userId: patient.id, doctorId: DEMO_DOCTOR_REF } });
  if (!appts.some((a) => a.status !== "cancelled" && a.date >= today)) {
    await prisma.appointment.create({
      data: { userId: patient.id, doctorId: DEMO_DOCTOR_REF, date: today, time: "15:00", name: patient.name || "Bemor", reason: "Chekap va tahlil natijalarini muhokama qilish", status: "pending", shareAccess: true },
    });
  }

  // 2. Ko'rsatkichlar — shifokor kiritgan namunalar
  const vitals: any[] = await prisma.vitalReading.findMany({ where: { userId: patient.id } });
  if (!vitals.some((v) => v.type !== "bp")) {
    for (const r of demoVitals(patient.id)) {
      await prisma.vitalReading.create({ data: { ...r, doctorRef: DEMO_DOCTOR_REF, doctorName: `${DEMO_DOCTOR_NAME}` } });
    }
  } else if (vitals.some((v) => v.note === "namuna" && !v.doctorRef)) {
    await prisma.vitalReading.updateMany({ where: { userId: patient.id, note: "namuna" }, data: { doctorRef: DEMO_DOCTOR_REF, doctorName: `${DEMO_DOCTOR_NAME}` } });
  }

  // 3. Shifokor o'tkazgan chekap
  const checkups: any[] = await prisma.checkup.findMany({ where: { userId: patient.id } });
  if (!checkups.some((c) => c.doctorRef)) {
    const pick: Record<string, number> = { activity: 1, smoking: 0, chest: 0, food: 1, digest: 1, pain: 1, sleep: 1, stress: 1, headache: 1, colds: 1, water: 1 };
    const answers: Record<string, number> = {};
    for (const q of QUESTIONS) answers[q.id] = pick[q.id] ?? 0;
    const r = scoreCheckup(answers);
    const c: any = await prisma.checkup.create({
      data: {
        userId: patient.id,
        answersJson: JSON.stringify(answers),
        score: r.score,
        scoresJson: JSON.stringify(r.areas),
        doctorRef: DEMO_DOCTOR_REF,
        doctorName: `${DEMO_DOCTOR_NAME}`,
        conclusion: "Umumiy holat qoniqarli. Jismoniy faollikni oshirish va uyqu rejimini tartibga solish tavsiya etiladi. Temir tanqisligi boʻyicha 1 oydan keyin qon tahlilini takrorlang.",
        diagnosis: "Temir tanqisligi anemiyasi, yengil daraja",
      },
    });
    await prisma.checkupNote.create({
      data: { checkupId: c.id, userId: patient.id, doctorRef: DEMO_DOCTOR_REF, doctorName: DEMO_DOCTOR_NAME, text: "Temir preparatini ovqatdan keyin iching. 1 oydan keyin qon tahlilini olib keling." },
    });
  }
}

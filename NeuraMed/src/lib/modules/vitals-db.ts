import { prisma } from "@/lib/prisma";
import { VITALS, assessVital } from "./vitals";

/** Bemorning ko'rsatkichlari (shifokor kiritgan), turlar bo'yicha guruhlangan va baholangan. */
export async function loadVitals(userId: string) {
  let rows: any[] = await prisma.vitalReading.findMany({ where: { userId } });
  const user: any = await prisma.user.findUnique({ where: { id: userId } });
  const known = new Set(VITALS.map((v) => v.type as string));
  rows = rows.filter((r) => known.has(r.type)).map((r) => ({ ...r, at: new Date(r.at).toISOString() })).sort((a, b) => b.at.localeCompare(a.at));
  const series = VITALS.map((def) => {
    const list = rows.filter((r) => r.type === def.type);
    const latest = list[0] || null;
    return {
      ...def,
      readings: list.slice(0, 30).map((r) => ({ id: r.id, value: r.value, value2: r.value2 ?? null, at: r.at, note: r.note ?? null, doctorName: r.doctorName ?? null })),
      latest: latest ? { value: latest.value, value2: latest.value2 ?? null, at: latest.at, doctorName: latest.doctorName ?? null, assessment: assessVital(def.type, latest.value, latest.value2, list.slice(1), user?.heightCm) } : null,
    };
  });
  const alerts = series.filter((s) => s.latest && s.latest.assessment.level !== "ok" && s.latest.assessment.level !== "info").map((s) => ({ type: s.type, label: s.label, ...s.latest!.assessment }));
  return { series, alerts };
}

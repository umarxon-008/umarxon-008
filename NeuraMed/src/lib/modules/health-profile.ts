import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptJson, encryptJson } from "@/lib/encryption";
import { parseJsonSafe } from "@/lib/utils";

/** Shifrlangan maydonni o'qish (eski/namunaviy ochiq JSON ham qo'llanadi). */
export function readJsonField<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try { return decryptJson<T>(val); } catch { return parseJsonSafe<T>(val, fallback); }
}

export interface HealthProfile {
  id: string; name: string | null; age: number | null; gender: string | null; heightCm: number | null; weightKg: number | null;
  allergies: string[]; chronicConditions: string[]; currentMedications: string[];
  emergencyContact: { name: string; phone: string } | null; pregnancyStatus: string | null;
}

export async function getHealthProfile(userId: string): Promise<HealthProfile | null> {
  const u: any = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;
  return {
    id: u.id, name: u.name ?? null, age: u.age ?? null, gender: u.gender ?? null, heightCm: u.heightCm ?? null, weightKg: u.weightKg ?? null,
    allergies: readJsonField<string[]>(u.allergiesJson, []),
    chronicConditions: readJsonField<string[]>(u.chronicConditionsJson, []),
    currentMedications: readJsonField<string[]>(u.currentMedicationsJson, []),
    emergencyContact: readJsonField<{ name: string; phone: string } | null>(u.emergencyContact, null),
    pregnancyStatus: u.pregnancyStatus ?? null,
  };
}

/** Faol eslatmalardagi va profildagi dorilar (takrorsiz). */
export async function activeMedicationNames(userId: string, profileMeds: string[] = []) {
  const rem: any[] = await prisma.reminder.findMany({ where: { userId, status: "ACTIVE" } });
  const names = [...rem.map((r) => `${r.medicationName}${r.dose ? ` ${r.dose}` : ""}`), ...profileMeds];
  return Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
}

export async function getOrCreateCard(userId: string) {
  const card: any = await prisma.healthCard.findFirst({ where: { userId } });
  if (card) return card;
  return prisma.healthCard.create({ data: { userId, bloodType: null, shareEnabled: false } }) as any;
}

export const newShareToken = () => crypto.randomBytes(18).toString("base64url");

export const encryptText = (s: string) => encryptJson(s);
export const decryptText = (s: string | null | undefined) => readJsonField<string>(s, "");

export const BLOOD_TYPES = ["O(I) Rh+", "O(I) Rh−", "A(II) Rh+", "A(II) Rh−", "B(III) Rh+", "B(III) Rh−", "AB(IV) Rh+", "AB(IV) Rh−"];

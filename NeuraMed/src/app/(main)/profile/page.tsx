import { TopBar } from "@/components/layout/top-bar";
import { ProfileClient } from "./profile-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/encryption";
import { parseJsonSafe } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, name: true, email: true, phone: true,
      age: true, gender: true, heightCm: true, weightKg: true,
      allergiesJson: true, chronicConditionsJson: true,
      currentMedicationsJson: true, pregnancyStatus: true,
      emergencyContact: true, language: true,
    },
  });

  if (!dbUser) redirect("/login");

  const decryptArr = (val: string | null) => {
    if (!val) return [];
    try { return decryptJson<string[]>(val); }
    catch { return parseJsonSafe<string[]>(val, []); }
  };
  const decryptContact = (val: string | null) => {
    if (!val) return undefined;
    try { return decryptJson<{ name: string; phone: string }>(val); }
    catch { return undefined; }
  };

  return (
    <>
      <TopBar title="Profil" />
      <ProfileClient
        profile={{
          id: dbUser.id,
          name: dbUser.name ?? undefined,
          email: dbUser.email ?? undefined,
          phone: dbUser.phone ?? undefined,
          age: dbUser.age ?? undefined,
          gender: dbUser.gender ?? undefined,
          heightCm: dbUser.heightCm ?? undefined,
          weightKg: dbUser.weightKg ?? undefined,
          allergies: decryptArr(dbUser.allergiesJson),
          chronicConditions: decryptArr(dbUser.chronicConditionsJson),
          currentMedications: decryptArr(dbUser.currentMedicationsJson),
          pregnancyStatus: dbUser.pregnancyStatus,
          emergencyContact: decryptContact(dbUser.emergencyContact),
          language: dbUser.language as "uz" | "ru" | "en",
        }}
      />
    </>
  );
}

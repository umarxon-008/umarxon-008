/**
 * QR tibbiy karta.
 *  GET   — karta, profil ma'lumotlari, QR (SVG) va ochiq havola
 *  PATCH — { bloodType?, notes?, emergencyContact?, shareEnabled?, regenerate? }
 */
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { encryptJson } from "@/lib/encryption";
import { apiError, HttpError, readJson } from "@/lib/modules/http";
import { BLOOD_TYPES, activeMedicationNames, decryptText, encryptText, getHealthProfile, getOrCreateCard, newShareToken } from "@/lib/modules/health-profile";

/** QR havolasi foydalanuvchi ochib turgan manzilga qaraydi (proxy ortida ham). */
const originOf = (req: NextRequest) => {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "http";
  return host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || req.nextUrl.origin;
};

async function payload(req: NextRequest, userId: string) {
  const [card, profile] = await Promise.all([getOrCreateCard(userId), getHealthProfile(userId)]);
  const meds = await activeMedicationNames(userId, profile?.currentMedications || []);
  const url = card.shareEnabled && card.shareToken ? `${originOf(req)}/c/${card.shareToken}` : null;
  const qrSvg = url ? await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0B2F55", light: "#FFFFFF" } }) : null;
  return {
    card: { bloodType: card.bloodType ?? null, notes: decryptText(card.notes), shareEnabled: !!card.shareEnabled, updatedAt: card.updatedAt },
    profile: profile && { name: profile.name, age: profile.age, gender: profile.gender, allergies: profile.allergies, chronicConditions: profile.chronicConditions, emergencyContact: profile.emergencyContact },
    medications: meds,
    shareUrl: url,
    qrSvg,
    bloodTypes: BLOOD_TYPES,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    return NextResponse.json(await payload(req, user.id));
  } catch (e) { return apiError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth();
    const b = await readJson(req);
    const card = await getOrCreateCard(user.id);
    const data: Record<string, unknown> = {};
    if (b?.bloodType !== undefined) {
      if (b.bloodType !== null && !BLOOD_TYPES.includes(b.bloodType)) throw new HttpError(400, "Qon guruhini roʻyxatdan tanlang");
      data.bloodType = b.bloodType;
    }
    if (typeof b?.notes === "string") data.notes = b.notes.trim() ? encryptText(b.notes.trim().slice(0, 300)) : null;
    if (b?.shareEnabled !== undefined) {
      data.shareEnabled = !!b.shareEnabled;
      if (b.shareEnabled && !card.shareToken) data.shareToken = newShareToken();
    }
    if (b?.regenerate) data.shareToken = newShareToken();
    if (Object.keys(data).length) await prisma.healthCard.update({ where: { id: card.id }, data });
    if (b?.emergencyContact !== undefined) {
      const c = b.emergencyContact;
      if (c && (typeof c.name !== "string" || typeof c.phone !== "string" || !/^\+?[\d\s()-]{7,17}$/.test(c.phone.trim()))) throw new HttpError(400, "Telefon raqami formati notoʻgʻri");
      await prisma.user.update({ where: { id: user.id }, data: { emergencyContact: c && c.name.trim() ? encryptJson({ name: c.name.trim().slice(0, 60), phone: c.phone.trim() }) : null } });
    }
    return NextResponse.json(await payload(req, user.id));
  } catch (e) { return apiError(e); }
}

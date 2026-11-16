import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { decryptJson, encryptJson } from "@/lib/encryption";
import type { PushSubscriptionData } from "@/types";

// VAPID kalitlari faqat bildirishnoma yuborilayotganda tekshiriladi:
// kalitlar bo'lmasa ilova (va build) ishlayveradi, faqat push bildirishnoma o'chiq bo'ladi.
let vapidReady: boolean | null = null;
export function isPushConfigured(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  if (!pub || !priv) return (vapidReady = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_EMAIL || "mailto:admin@neuramed.uz", pub, priv);
    vapidReady = true;
  } catch {
    vapidReady = false;
  }
  return vapidReady;
}

export async function saveSubscription(
  userId: string,
  subscription: PushSubscriptionData
): Promise<void> {
  const encrypted = encryptJson(subscription);
  await prisma.user.update({
    where: { id: userId },
    data: { pushSubscriptionJson: encrypted },
  });
}

export async function getSubscription(
  userId: string
): Promise<PushSubscriptionData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushSubscriptionJson: true },
  });

  if (!user?.pushSubscriptionJson) return null;

  try {
    return decryptJson<PushSubscriptionData>(user.pushSubscriptionJson);
  } catch {
    return null;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  reminderId?: string;
  medicationName?: string;
  dose?: string;
  foodRule?: string;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  if (!isPushConfigured()) return false; // VAPID kalitlari sozlanmagan
  const subscription = await getSubscription(userId);
  if (!subscription) return false;

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || "/icons/icon-192x192.png",
        badge: payload.badge || "/icons/icon-72x72.png",
        data: {
          url: payload.url || "/",
          reminderId: payload.reminderId,
          medicationName: payload.medicationName,
        },
      })
    );
    return true;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      (error as { statusCode: number }).statusCode === 410
    ) {
      // Subscription expired — remove it
      await prisma.user.update({
        where: { id: userId },
        data: { pushSubscriptionJson: null },
      });
    }
    console.error("Push notification failed:", error);
    return false;
  }
}

export async function sendReminderNotification(
  userId: string,
  reminderId: string,
  medicationName: string,
  dose: string,
  foodRule: string
): Promise<boolean> {
  const foodNote =
    foodRule === "ovqat_bilan"
      ? "Ovqat bilan iching"
      : foodRule === "bosh_qorin"
      ? "Bo'sh qorinda iching"
      : "";

  return sendPushNotification(userId, {
    title: `💊 ${medicationName} vaqti keldi`,
    body: `${dose}${foodNote ? " — " + foodNote : ""}`,
    url: `/reminders/${reminderId}`,
    reminderId,
    medicationName,
    dose,
    foodRule,
  });
}

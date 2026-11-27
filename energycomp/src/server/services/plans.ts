import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '../db';
import { featureUnavailable, limitExceeded, notFound } from '../errors';
import { startOfZonedDay } from '@/lib/time';
import type { PlanFeature } from '@/schemas/plans';

type Tx = Prisma.TransactionClient | typeof prisma;

/** Standart tariflar. Narxlar belgilanmagan (null) — platform admin sozlaydi. */
export const DEFAULT_PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    description: '2D xarita, asosiy monitoring va analytics, cheklangan AI tahlili.',
    priceMonthly: null,
    currency: 'UZS',
    maxFactories: 1,
    maxEquipment: 15,
    maxUsers: 3,
    aiAnalysesPerDay: 5,
    historyDays: 31,
    features: ['map2d'] as PlanFeature[],
    sortOrder: 1,
  },
  {
    key: 'PRO',
    name: 'Pro',
    description: 'Kengaytirilgan AI va analytics, integratsiyalar, ko‘proq limitlar. 3D xarita keyingi bosqichda.',
    priceMonthly: null,
    currency: 'UZS',
    maxFactories: 10,
    maxEquipment: 500,
    maxUsers: 50,
    aiAnalysesPerDay: 200,
    historyDays: 730,
    features: ['map2d', 'map3d', 'advancedAi', 'advancedAnalytics', 'integrations'] as PlanFeature[],
    sortOrder: 2,
  },
];

/** Mavjud tariflarni o'zgartirmaydi — faqat yo'qlarini yaratadi (admin sozlamalari saqlanadi). */
export async function ensureDefaultPlans(tx: Tx = prisma) {
  for (const p of DEFAULT_PLANS) {
    await tx.plan.upsert({ where: { key: p.key }, update: {}, create: { ...p, features: p.features } });
  }
}

export interface PlanInfo {
  id: string;
  key: string;
  name: string;
  description: string;
  priceMonthly: number | null;
  currency: string;
  maxFactories: number;
  maxEquipment: number;
  maxUsers: number;
  aiAnalysesPerDay: number;
  historyDays: number;
  features: PlanFeature[];
}

export function toPlanInfo(p: {
  id: string;
  key: string;
  name: string;
  description: string;
  priceMonthly: Prisma.Decimal | null;
  currency: string;
  maxFactories: number;
  maxEquipment: number;
  maxUsers: number;
  aiAnalysesPerDay: number;
  historyDays: number;
  features: Prisma.JsonValue;
}): PlanInfo {
  return {
    ...p,
    priceMonthly: p.priceMonthly === null ? null : Number(p.priceMonthly),
    features: Array.isArray(p.features) ? (p.features as PlanFeature[]) : [],
  };
}

export async function listPlans(): Promise<PlanInfo[]> {
  await ensureDefaultPlans();
  const plans = await prisma.plan.findMany({ where: { isPublic: true }, orderBy: { sortOrder: 'asc' } });
  return plans.map(toPlanInfo);
}

export async function getOrgSubscription(organizationId: string) {
  const sub = await prisma.subscription.findUnique({ where: { organizationId }, include: { plan: true } });
  if (sub) return { ...sub, plan: toPlanInfo(sub.plan) };
  // Obuna yo'q bo'lsa (eski ma'lumot) — Free bilan yaratamiz
  await ensureDefaultPlans();
  const free = await prisma.plan.findUniqueOrThrow({ where: { key: 'FREE' } });
  const created = await prisma.subscription.create({
    data: { organizationId, planId: free.id, status: 'DEMO', isDemo: true },
    include: { plan: true },
  });
  return { ...created, plan: toPlanInfo(created.plan) };
}

export async function getOrgPlan(organizationId: string): Promise<PlanInfo> {
  return (await getOrgSubscription(organizationId)).plan;
}

export async function hasFeature(organizationId: string, feature: PlanFeature): Promise<boolean> {
  return (await getOrgPlan(organizationId)).features.includes(feature);
}

export async function assertFeature(organizationId: string, feature: PlanFeature, label: string): Promise<void> {
  if (!(await hasFeature(organizationId, feature))) {
    throw featureUnavailable(`"${label}" imkoniyati joriy tarifingizda mavjud emas. Pro tarifiga o'ting.`);
  }
}

export type LimitKind = 'equipment' | 'users' | 'factories';

export async function getUsage(organizationId: string, tx: Tx = prisma) {
  const [equipment, users, factories] = await Promise.all([
    tx.equipment.count({ where: { organizationId } }),
    tx.organizationMember.count({ where: { organizationId } }),
    tx.factory.count({ where: { organizationId } }),
  ]);
  return { equipment, users, factories };
}

const LIMIT_LABELS: Record<LimitKind, string> = { equipment: 'uskunalar', users: 'foydalanuvchilar', factories: 'zavodlar' };

/** Tarif limitini backendda tekshiradi. Transaction ichida chaqirish tavsiya etiladi. */
export async function assertWithinLimit(organizationId: string, kind: LimitKind, tx: Tx = prisma): Promise<void> {
  const plan = await getOrgPlan(organizationId);
  const usage = await getUsage(organizationId, tx);
  const max = kind === 'equipment' ? plan.maxEquipment : kind === 'users' ? plan.maxUsers : plan.maxFactories;
  if (usage[kind] >= max) {
    throw limitExceeded(
      `${plan.name} tarifida ${LIMIT_LABELS[kind]} soni ${max} ta bilan cheklangan. Limitni oshirish uchun tarifni o'zgartiring.`,
      { kind, max, current: usage[kind] },
    );
  }
}

export async function getAiQuota(organizationId: string, timezone: string) {
  const plan = await getOrgPlan(organizationId);
  const since = startOfZonedDay(new Date(), timezone);
  const used = await prisma.aIAnalysis.count({
    where: { organizationId, requestedById: { not: null }, createdAt: { gte: since } },
  });
  return { used, limit: plan.aiAnalysesPerDay, remaining: Math.max(0, plan.aiAnalysesPerDay - used) };
}

export async function assertAiQuota(organizationId: string, timezone: string): Promise<void> {
  const q = await getAiQuota(organizationId, timezone);
  if (q.remaining <= 0) {
    throw limitExceeded(`Bugungi AI tahlil limiti (${q.limit} ta) tugadi. Ertaga qayta urinib ko'ring yoki tarifni o'zgartiring.`, q);
  }
}

export async function getPlanByKey(key: string) {
  const plan = await prisma.plan.findUnique({ where: { key } });
  if (!plan) throw notFound('Tarif topilmadi');
  return plan;
}

import 'server-only';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { conflict, forbidden } from '../errors';
import type { AuthContext } from '../auth/context';
import { getPlanByKey, getUsage, toPlanInfo } from './plans';
import type { PlanFeature } from '@/schemas/plans';

/**
 * Demo rejimida tarifni almashtirish. To'lov provayderi ulanmagan — hech qanday to'lov olinmaydi,
 * obuna "DEMO" holatida qoladi.
 */
export async function changePlanDemo(ctx: AuthContext, planKey: string) {
  const plan = await getPlanByKey(planKey);
  const usage = await getUsage(ctx.org.id);
  if (usage.equipment > plan.maxEquipment || usage.users > plan.maxUsers || usage.factories > plan.maxFactories) {
    throw conflict(
      `Joriy foydalanish (${usage.equipment} uskuna, ${usage.users} foydalanuvchi, ${usage.factories} zavod) "${plan.name}" tarifi limitlaridan oshadi.`,
    );
  }
  const sub = await prisma.subscription.upsert({
    where: { organizationId: ctx.org.id },
    update: { planId: plan.id, status: 'DEMO', isDemo: true },
    create: { organizationId: ctx.org.id, planId: plan.id, status: 'DEMO', isDemo: true },
  });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'billing.plan_changed_demo', entityType: 'Subscription', entityId: sub.id, metadata: { planKey } });
  return sub;
}

/** Faqat platform admin: tarif narxi va limitlarini sozlash. */
export async function updatePlan(
  ctx: { user: { id: string; isPlatformAdmin: boolean } },
  key: string,
  data: {
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
  },
) {
  if (!ctx.user.isPlatformAdmin) throw forbidden('Faqat platforma administratori tariflarni sozlay oladi');
  await getPlanByKey(key);
  const plan = await prisma.plan.update({ where: { key }, data: { ...data, features: data.features } });
  await writeAudit({ actorId: ctx.user.id, action: 'plan.updated', entityType: 'Plan', entityId: plan.id, metadata: { key, ...data } });
  return toPlanInfo(plan);
}

export async function listOrganizationsForAdmin(ctx: { user: { isPlatformAdmin: boolean } }) {
  if (!ctx.user.isPlatformAdmin) throw forbidden();
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: { subscription: { include: { plan: true } }, _count: { select: { members: true, equipment: true, factories: true } } },
  });
  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    industry: o.industry,
    isDemo: o.isDemo,
    createdAt: o.createdAt,
    plan: o.subscription?.plan.name ?? '—',
    members: o._count.members,
    equipment: o._count.equipment,
    factories: o._count.factories,
  }));
}

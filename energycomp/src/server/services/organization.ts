import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { conflict, notFound } from '../errors';
import { DEFAULT_CATEGORIES } from '@/lib/labels';
import { slugify } from '@/lib/utils';
import { parseZonedDateInput } from '@/lib/time';
import type { AuthContext } from '../auth/context';
import { ensureDefaultPlans } from './plans';

type Tx = Prisma.TransactionClient;

export const DEFAULT_TARIFF_UZS = 1000; // so'm/kWh — taxminiy boshlang'ich qiymat, foydalanuvchi o'zgartiradi

async function uniqueSlug(tx: Tx, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await tx.organization.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  return slug;
}

/** Yangi tashkilot: owner membership, standart kategoriyalar, birinchi zavod va xarita, tarif, Free obuna. */
export async function createOrganizationWithOwner(
  tx: Tx,
  params: { name: string; industry: string; ownerId: string; timezone?: string; currency?: string; isDemo?: boolean },
) {
  await ensureDefaultPlans(tx);
  const free = await tx.plan.findUniqueOrThrow({ where: { key: 'FREE' } });
  const org = await tx.organization.create({
    data: {
      name: params.name,
      slug: await uniqueSlug(tx, params.name),
      industry: params.industry,
      timezone: params.timezone ?? 'Asia/Tashkent',
      currency: params.currency ?? 'UZS',
      isDemo: params.isDemo ?? false,
      members: { create: { userId: params.ownerId, role: 'OWNER' } },
      categories: { create: DEFAULT_CATEGORIES.map((name) => ({ name })) },
      subscription: { create: { planId: free.id, status: 'DEMO', isDemo: true } },
      tariffs: {
        create: {
          name: 'Asosiy tarif',
          pricePerKwh: DEFAULT_TARIFF_UZS,
          currency: params.currency ?? 'UZS',
          validFrom: new Date('2020-01-01T00:00:00Z'),
        },
      },
      integrations: {
        create: {
          type: 'DEMO_PROVIDER',
          name: 'Demo Data Provider',
          status: 'ACTIVE',
          config: { note: 'Simulyatsiya qilingan ma’lumotlar' },
        },
      },
    },
  });
  const factory = await tx.factory.create({
    data: { organizationId: org.id, name: 'Asosiy zavod', description: 'Birinchi zavod (nomini o‘zgartirishingiz mumkin)' },
  });
  await tx.mapLayout.create({
    data: {
      organizationId: org.id,
      factoryId: factory.id,
      width: 1000,
      height: 600,
      zones: [
        { id: 'z1', name: 'Ishlab chiqarish sexi', x: 40, y: 40, width: 560, height: 520, color: 'blue' },
        { id: 'z2', name: 'Yordamchi xona', x: 640, y: 40, width: 320, height: 250, color: 'green' },
        { id: 'z3', name: 'Ombor', x: 640, y: 320, width: 320, height: 240, color: 'slate' },
      ],
    },
  });
  return { org, factory };
}

export async function getOrganizationDetails(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { tariffs: { orderBy: { validFrom: 'desc' } }, categories: { orderBy: { name: 'asc' } } },
  });
  if (!org) throw notFound('Tashkilot topilmadi');
  return {
    ...org,
    tariffs: org.tariffs.map((t) => ({ ...t, pricePerKwh: Number(t.pricePerKwh) })),
  };
}

export async function updateOrganization(
  ctx: AuthContext,
  data: { name: string; industry: string; timezone: string; currency: string },
) {
  const before = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.org.id } });
  const org = await prisma.organization.update({ where: { id: ctx.org.id }, data });
  await writeAudit({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    action: 'organization.updated',
    entityType: 'Organization',
    entityId: ctx.org.id,
    metadata: { before: { name: before.name, timezone: before.timezone, currency: before.currency }, after: data },
  });
  return org;
}

export async function setBaseline(ctx: AuthContext, data: { baselineStart: string | null; baselineEnd: string | null }) {
  const tz = ctx.org.timezone;
  const start = data.baselineStart ? parseZonedDateInput(data.baselineStart, tz) : null;
  const end = data.baselineEnd ? parseZonedDateInput(data.baselineEnd, tz) : null;
  await prisma.organization.update({ where: { id: ctx.org.id }, data: { baselineStart: start, baselineEnd: end } });
  await writeAudit({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    action: 'organization.baseline_updated',
    entityType: 'Organization',
    entityId: ctx.org.id,
    metadata: data,
  });
}

export async function setControlMode(ctx: AuthContext, controlMode: 'READ_ONLY' | 'SIMULATION') {
  await prisma.organization.update({ where: { id: ctx.org.id }, data: { controlMode } });
  await writeAudit({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    action: 'control.mode_changed',
    entityType: 'Organization',
    entityId: ctx.org.id,
    metadata: { controlMode },
  });
}

export async function addTariff(ctx: AuthContext, data: { name: string; pricePerKwh: number; validFrom: string }) {
  const validFrom = parseZonedDateInput(data.validFrom, ctx.org.timezone);
  if (!validFrom) throw conflict("Sana noto'g'ri");
  const tariff = await prisma.energyTariff.create({
    data: {
      organizationId: ctx.org.id,
      name: data.name,
      pricePerKwh: data.pricePerKwh,
      currency: ctx.org.currency,
      validFrom,
    },
  });
  await writeAudit({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    action: 'tariff.created',
    entityType: 'EnergyTariff',
    entityId: tariff.id,
    metadata: data,
  });
  return tariff;
}

export async function deleteTariff(ctx: AuthContext, tariffId: string) {
  const count = await prisma.energyTariff.count({ where: { organizationId: ctx.org.id } });
  const t = await prisma.energyTariff.findFirst({ where: { id: tariffId, organizationId: ctx.org.id } });
  if (!t) throw notFound('Tarif topilmadi');
  if (count <= 1) throw conflict('Kamida bitta energiya tarifi qolishi kerak');
  await prisma.energyTariff.delete({ where: { id: t.id } });
  await writeAudit({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    action: 'tariff.deleted',
    entityType: 'EnergyTariff',
    entityId: t.id,
  });
}

export async function getTariffPoints(organizationId: string) {
  const tariffs = await prisma.energyTariff.findMany({
    where: { organizationId },
    orderBy: { validFrom: 'asc' },
    select: { pricePerKwh: true, validFrom: true },
  });
  return tariffs.map((t) => ({ pricePerKwh: Number(t.pricePerKwh), validFrom: t.validFrom }));
}

export async function addCategory(ctx: AuthContext, name: string) {
  const exists = await prisma.equipmentCategory.findUnique({
    where: { organizationId_name: { organizationId: ctx.org.id, name } },
  });
  if (exists) throw conflict('Bu nomdagi kategoriya mavjud');
  return prisma.equipmentCategory.create({ data: { organizationId: ctx.org.id, name } });
}

export async function deleteCategory(ctx: AuthContext, id: string) {
  const c = await prisma.equipmentCategory.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!c) throw notFound('Kategoriya topilmadi');
  await prisma.equipmentCategory.delete({ where: { id: c.id } });
}

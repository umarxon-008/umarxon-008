import 'server-only';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { conflict, notFound } from '../errors';
import type { AuthContext } from '../auth/context';
import { assertWithinLimit } from './plans';
import type { Zone } from '@/schemas/organization';

export async function listFactories(organizationId: string) {
  return prisma.factory.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { equipment: true } } },
  });
}

export async function getFactory(organizationId: string, id: string) {
  const f = await prisma.factory.findFirst({ where: { id, organizationId } });
  if (!f) throw notFound('Zavod topilmadi');
  return f;
}

export async function createFactory(ctx: AuthContext, data: { name: string; address?: string | null; description?: string | null }) {
  const exists = await prisma.factory.findFirst({ where: { organizationId: ctx.org.id, name: data.name } });
  if (exists) throw conflict('Bu nomdagi zavod mavjud');
  return prisma.$transaction(async (tx) => {
    await assertWithinLimit(ctx.org.id, 'factories', tx);
    const factory = await tx.factory.create({
      data: { organizationId: ctx.org.id, name: data.name, address: data.address ?? null, description: data.description ?? null },
    });
    await tx.mapLayout.create({
      data: {
        organizationId: ctx.org.id,
        factoryId: factory.id,
        width: 1000,
        height: 600,
        zones: [{ id: 'z1', name: 'Asosiy sex', x: 40, y: 40, width: 920, height: 520, color: 'blue' }],
      },
    });
    await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'factory.created', entityType: 'Factory', entityId: factory.id, metadata: { name: data.name } }, tx);
    return factory;
  });
}

export async function updateFactory(ctx: AuthContext, id: string, data: { name: string; address?: string | null; description?: string | null }) {
  await getFactory(ctx.org.id, id);
  const dup = await prisma.factory.findFirst({ where: { organizationId: ctx.org.id, name: data.name, NOT: { id } } });
  if (dup) throw conflict('Bu nomdagi zavod mavjud');
  const f = await prisma.factory.update({
    where: { id },
    data: { name: data.name, address: data.address ?? null, description: data.description ?? null },
  });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'factory.updated', entityType: 'Factory', entityId: id, metadata: { name: data.name } });
  return f;
}

export async function deleteFactory(ctx: AuthContext, id: string) {
  const f = await getFactory(ctx.org.id, id);
  const count = await prisma.factory.count({ where: { organizationId: ctx.org.id } });
  if (count <= 1) throw conflict('Kamida bitta zavod qolishi kerak');
  const eqCount = await prisma.equipment.count({ where: { factoryId: id } });
  if (eqCount > 0) throw conflict(`Zavodda ${eqCount} ta uskuna bor. Avval ularni boshqa zavodga o'tkazing yoki o'chiring.`);
  await prisma.factory.delete({ where: { id: f.id } });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'factory.deleted', entityType: 'Factory', entityId: id, metadata: { name: f.name } });
}

export async function getMapLayout(organizationId: string, factoryId: string) {
  await getFactory(organizationId, factoryId);
  const layout = await prisma.mapLayout.findUnique({ where: { factoryId } });
  if (layout) return { ...layout, zones: (layout.zones as unknown as Zone[]) ?? [] };
  const created = await prisma.mapLayout.create({ data: { organizationId, factoryId, zones: [] } });
  return { ...created, zones: [] as Zone[] };
}

export async function updateMapLayout(ctx: AuthContext, factoryId: string, data: { width: number; height: number; zones: Zone[] }) {
  await getFactory(ctx.org.id, factoryId);
  const layout = await prisma.mapLayout.upsert({
    where: { factoryId },
    update: { width: data.width, height: data.height, zones: data.zones },
    create: { organizationId: ctx.org.id, factoryId, width: data.width, height: data.height, zones: data.zones },
  });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'map.layout_updated', entityType: 'MapLayout', entityId: layout.id, metadata: { zones: data.zones.length } });
  return layout;
}

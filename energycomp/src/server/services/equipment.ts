import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { conflict, notFound, validationError } from '../errors';
import { equipmentRepo } from '../repositories/equipment';
import type { AuthContext } from '../auth/context';
import { assertWithinLimit } from './plans';
import { invalidateSync } from './telemetry-sync';
import type { EquipmentData } from '@/schemas/equipment';
import type { z } from 'zod';
import type { equipmentListQuerySchema } from '@/schemas/equipment';

export type EquipmentListQuery = z.infer<typeof equipmentListQuerySchema>;

async function assertRefs(organizationId: string, data: { factoryId: string; categoryId: string | null }) {
  const factory = await prisma.factory.findFirst({ where: { id: data.factoryId, organizationId } });
  if (!factory) throw validationError('Zavod topilmadi', { factoryId: 'Zavod topilmadi' });
  if (data.categoryId) {
    const c = await prisma.equipmentCategory.findFirst({ where: { id: data.categoryId, organizationId } });
    if (!c) throw validationError('Kategoriya topilmadi', { categoryId: 'Kategoriya topilmadi' });
  }
}

function uniqueViolation(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
    const target = JSON.stringify((err as { meta?: unknown }).meta ?? '');
    if (target.includes('sensorId')) return 'Bu sensor identifikatori boshqa uskunaga biriktirilgan';
    return 'Bu kod bilan uskuna mavjud';
  }
  return null;
}

export async function listEquipment(ctx: AuthContext, q: EquipmentListQuery) {
  const where: Prisma.EquipmentWhereInput = {};
  if (q.q) {
    where.OR = [
      { name: { contains: q.q, mode: 'insensitive' } },
      { code: { contains: q.q, mode: 'insensitive' } },
      { location: { contains: q.q, mode: 'insensitive' } },
    ];
  }
  if (q.factoryId) where.factoryId = q.factoryId;
  if (q.status) where.status = q.status;
  if (q.categoryId) where.categoryId = q.categoryId;
  const orderField = { name: 'name', power: 'currentPowerKw', status: 'status', code: 'code' }[q.sort] as
    | 'name'
    | 'currentPowerKw'
    | 'status'
    | 'code';
  const [items, total] = await Promise.all([
    equipmentRepo.list(ctx.org.id, where, { [orderField]: q.order }, (q.page - 1) * q.pageSize, q.pageSize),
    equipmentRepo.count(ctx.org.id, where),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize };
}

export async function getEquipment(ctx: AuthContext, id: string) {
  const eq = await equipmentRepo.findById(ctx.org.id, id);
  if (!eq) throw notFound('Uskuna topilmadi');
  return eq;
}

export async function createEquipment(ctx: AuthContext, data: EquipmentData) {
  await assertRefs(ctx.org.id, data);
  try {
    const eq = await prisma.$transaction(async (tx) => {
      await assertWithinLimit(ctx.org.id, 'equipment', tx);
      const created = await tx.equipment.create({
        data: {
          organizationId: ctx.org.id,
          factoryId: data.factoryId,
          categoryId: data.categoryId,
          name: data.name,
          code: data.code,
          manufacturer: data.manufacturer,
          model: data.model,
          location: data.location,
          nominalPowerKw: data.nominalPowerKw,
          idleThresholdKw: data.idleThresholdKw,
          standbyThresholdKw: data.standbyThresholdKw,
          baselinePowerKw: data.baselinePowerKw,
          sensorId: data.sensorId,
          dataSource: data.dataSource,
          hasProductionSignal: data.hasProductionSignal,
          mapX: data.mapX ?? 120,
          mapY: data.mapY ?? 120,
          demoConfig: data.dataSource === 'DEMO' ? { profile: 'shift' } : undefined,
        },
      });
      await writeAudit(
        { organizationId: ctx.org.id, actorId: ctx.user.id, action: 'equipment.created', entityType: 'Equipment', entityId: created.id, metadata: { name: created.name, code: created.code } },
        tx,
      );
      return created;
    });
    invalidateSync(ctx.org.id);
    return eq;
  } catch (err) {
    const msg = uniqueViolation(err);
    if (msg) throw conflict(msg);
    throw err;
  }
}

export async function updateEquipment(ctx: AuthContext, id: string, data: EquipmentData) {
  const existing = await getEquipment(ctx, id);
  await assertRefs(ctx.org.id, data);
  try {
    const updated = await prisma.equipment.update({
      where: { id: existing.id },
      data: {
        factoryId: data.factoryId,
        categoryId: data.categoryId,
        name: data.name,
        code: data.code,
        manufacturer: data.manufacturer,
        model: data.model,
        location: data.location,
        nominalPowerKw: data.nominalPowerKw,
        idleThresholdKw: data.idleThresholdKw,
        standbyThresholdKw: data.standbyThresholdKw,
        baselinePowerKw: data.baselinePowerKw,
        sensorId: data.sensorId,
        dataSource: data.dataSource,
        hasProductionSignal: data.hasProductionSignal,
        ...(data.mapX !== undefined ? { mapX: data.mapX } : {}),
        ...(data.mapY !== undefined ? { mapY: data.mapY } : {}),
        ...(data.dataSource === 'DEMO' && !existing.demoConfig ? { demoConfig: { profile: 'shift' } } : {}),
      },
    });
    await writeAudit({
      organizationId: ctx.org.id,
      actorId: ctx.user.id,
      action: 'equipment.updated',
      entityType: 'Equipment',
      entityId: id,
      metadata: { name: updated.name },
    });
    invalidateSync(ctx.org.id);
    return updated;
  } catch (err) {
    const msg = uniqueViolation(err);
    if (msg) throw conflict(msg);
    throw err;
  }
}

export async function deleteEquipment(ctx: AuthContext, id: string) {
  const existing = await getEquipment(ctx, id);
  await prisma.$transaction(async (tx) => {
    await tx.equipment.delete({ where: { id: existing.id } });
    await writeAudit(
      { organizationId: ctx.org.id, actorId: ctx.user.id, action: 'equipment.deleted', entityType: 'Equipment', entityId: id, metadata: { name: existing.name, code: existing.code } },
      tx,
    );
  });
}

export async function setEquipmentPosition(ctx: AuthContext, id: string, pos: { mapX: number; mapY: number }) {
  const existing = await getEquipment(ctx, id);
  const layout = await prisma.mapLayout.findUnique({ where: { factoryId: existing.factoryId } });
  const maxX = layout?.width ?? 10_000;
  const maxY = layout?.height ?? 10_000;
  const mapX = Math.min(Math.max(pos.mapX, 0), maxX);
  const mapY = Math.min(Math.max(pos.mapY, 0), maxY);
  await prisma.equipment.update({ where: { id }, data: { mapX, mapY } });
  await writeAudit({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    action: 'map.equipment_moved',
    entityType: 'Equipment',
    entityId: id,
    metadata: { from: { x: existing.mapX, y: existing.mapY }, to: { x: mapX, y: mapY } },
  });
  return { mapX, mapY };
}

export async function listCategories(organizationId: string) {
  return prisma.equipmentCategory.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
}

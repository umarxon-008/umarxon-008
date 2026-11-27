import 'server-only';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { notFound, unauthorized } from '../errors';
import type { AuthContext } from '../auth/context';
import { generateToken, sha256 } from '../auth/tokens';
import { energyKwhFromPower } from '@/lib/energy';
import { assertFeature } from './plans';
import { refreshEquipmentSnapshots } from './telemetry-sync';
import type { z } from 'zod';
import type { ingestSchema } from '@/schemas/telemetry';

export async function listIntegrations(organizationId: string) {
  return prisma.integration.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, type: true, name: true, status: true, tokenPrefix: true, lastUsedAt: true, createdAt: true },
  });
}

/** HTTP ingest uchun token yaratadi. Xom token faqat bir marta qaytariladi; bazada faqat hash. */
export async function createIngestToken(ctx: AuthContext, name: string) {
  await assertFeature(ctx.org.id, 'integrations', 'Integratsiyalar');
  const token = `ec_${generateToken(24)}`;
  const integration = await prisma.integration.create({
    data: {
      organizationId: ctx.org.id,
      type: 'HTTP_INGEST',
      name,
      status: 'ACTIVE',
      tokenHash: sha256(token),
      tokenPrefix: token.slice(0, 8),
    },
  });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'integration.token_created', entityType: 'Integration', entityId: integration.id, metadata: { name } });
  return { integration, token };
}

export async function revokeIntegration(ctx: AuthContext, id: string) {
  const i = await prisma.integration.findFirst({ where: { id, organizationId: ctx.org.id, type: 'HTTP_INGEST' } });
  if (!i) throw notFound('Integratsiya topilmadi');
  await prisma.integration.update({ where: { id }, data: { status: 'DISABLED', tokenHash: null } });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'integration.revoked', entityType: 'Integration', entityId: id });
}

type IngestPayload = z.infer<typeof ingestSchema>;

/** Tashqi gateway'dan kelgan o'lchovlarni REAL manba sifatida saqlaydi. */
export async function ingestReadings(bearer: string | null, payload: IngestPayload) {
  if (!bearer) throw unauthorized('Token ko‘rsatilmagan');
  const integration = await prisma.integration.findUnique({ where: { tokenHash: sha256(bearer) } });
  if (!integration || integration.status !== 'ACTIVE' || integration.type !== 'HTTP_INGEST') throw unauthorized('Token yaroqsiz');
  const organizationId = integration.organizationId;
  const sensorIds = [...new Set(payload.readings.map((r) => r.sensorId))];
  const equipment = await prisma.equipment.findMany({ where: { organizationId, sensorId: { in: sensorIds } }, select: { id: true, sensorId: true, dataSource: true } });
  const bySensor = new Map(equipment.map((e) => [e.sensorId!, e]));
  const accepted: { equipmentId: string; r: IngestPayload['readings'][number] }[] = [];
  const rejected: { sensorId: string; reason: string }[] = [];
  const now = Date.now();
  for (const r of payload.readings) {
    const eq = bySensor.get(r.sensorId);
    if (!eq) rejected.push({ sensorId: r.sensorId, reason: 'sensorId bo‘yicha uskuna topilmadi' });
    else if (eq.dataSource !== 'REAL') rejected.push({ sensorId: r.sensorId, reason: 'Uskuna ma’lumot manbasi REAL emas' });
    else if (new Date(r.timestamp).getTime() > now + 5 * 60_000) rejected.push({ sensorId: r.sensorId, reason: 'Kelajakdagi vaqt' });
    else accepted.push({ equipmentId: eq.id, r });
  }
  if (accepted.length) {
    const tel = await prisma.equipmentTelemetry.createMany({
      data: accepted.map(({ equipmentId, r }) => ({
        organizationId,
        equipmentId,
        timestamp: new Date(r.timestamp),
        intervalSeconds: r.intervalSeconds,
        powerKw: r.powerKw,
        energyKwh: r.energyKwh ?? energyKwhFromPower(r.powerKw, r.intervalSeconds),
        source: 'REAL' as const,
      })),
      skipDuplicates: true,
    });
    const signals = accepted.filter(({ r }) => r.isProducing !== undefined);
    if (signals.length) {
      await prisma.productionSignal.createMany({
        data: signals.map(({ equipmentId, r }) => ({
          organizationId,
          equipmentId,
          timestamp: new Date(r.timestamp),
          isProducing: r.isProducing!,
          count: r.productionCount ?? null,
          source: 'REAL' as const,
        })),
        skipDuplicates: true,
      });
    }
    const energyByEq = new Map<string, number>();
    for (const { equipmentId, r } of accepted) {
      energyByEq.set(equipmentId, (energyByEq.get(equipmentId) ?? 0) + (r.energyKwh ?? energyKwhFromPower(r.powerKw, r.intervalSeconds)));
    }
    for (const [id, kwh] of energyByEq) await prisma.equipment.update({ where: { id }, data: { totalEnergyKwh: { increment: kwh } } });
    await prisma.integration.update({ where: { id: integration.id }, data: { lastUsedAt: new Date() } });
    await refreshEquipmentSnapshots(organizationId);
    return { accepted: tel.count, duplicates: accepted.length - tel.count, rejected };
  }
  return { accepted: 0, duplicates: 0, rejected };
}

import 'server-only';
import { prisma } from '../db';
import { serverEnv } from '../env';
import { demoDataProvider } from '../providers/sensor/demo';
import { deriveStatus, resolveThresholds } from '@/lib/status';
import { DAY } from '@/lib/time';

const MAX_BACKFILL_MS = 31 * DAY;
const CHUNK = 5000;

async function insertChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

/**
 * DEMO manbali uskunalar uchun oxirgi o'lchovdan hozirgacha bo'lgan bo'shliqni Demo Data Provider bilan to'ldiradi,
 * so'ng barcha uskunalarning joriy holatini (quvvat, status, oxirgi aloqa) yangilaydi.
 */
export async function syncOrganizationTelemetry(organizationId: string, now = new Date()) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
  if (!org) return { inserted: 0 };
  const equipment = await prisma.equipment.findMany({ where: { organizationId } });
  let inserted = 0;

  for (const eq of equipment) {
    if (eq.dataSource !== 'DEMO' || !serverEnv.demoDataEnabled) continue;
    const last = await prisma.equipmentTelemetry.findFirst({
      where: { equipmentId: eq.id },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    const fromMs = Math.max(last ? last.timestamp.getTime() + 1 : now.getTime() - MAX_BACKFILL_MS, now.getTime() - MAX_BACKFILL_MS);
    if (now.getTime() - fromMs < 60_000) continue;
    const batch = demoDataProvider.pull!(eq, new Date(fromMs), now, org.timezone);
    if (batch.telemetry.length === 0) continue;
    await insertChunks(batch.telemetry, (chunk) =>
      prisma.equipmentTelemetry.createMany({
        data: chunk.map((r) => ({ ...r, organizationId, equipmentId: eq.id, source: 'DEMO' as const })),
        skipDuplicates: true,
      }),
    );
    await insertChunks(batch.signals, (chunk) =>
      prisma.productionSignal.createMany({
        data: chunk.map((s) => ({
          organizationId,
          equipmentId: eq.id,
          timestamp: s.timestamp,
          isProducing: s.isProducing,
          count: s.count ?? null,
          source: 'DEMO' as const,
        })),
        skipDuplicates: true,
      }),
    );
    inserted += batch.telemetry.length;
    const energyAdded = batch.telemetry.reduce((s, r) => s + r.energyKwh, 0);
    await prisma.equipment.update({ where: { id: eq.id }, data: { totalEnergyKwh: { increment: energyAdded } } });
  }

  await refreshEquipmentSnapshots(organizationId, now);
  return { inserted };
}

/** Uskunalarning joriy holatini so'nggi o'lchov va faol ogohlantirishlar asosida qayta hisoblaydi. */
export async function refreshEquipmentSnapshots(organizationId: string, now = new Date()) {
  const equipment = await prisma.equipment.findMany({ where: { organizationId } });
  const activeAlerts = await prisma.alert.findMany({
    where: {
      organizationId,
      status: { in: ['NEW', 'ACKNOWLEDGED'] },
      conditionActive: true,
      severity: { in: ['WARNING', 'CRITICAL'] },
      rule: { not: 'NO_DATA' },
    },
    select: { equipmentId: true },
  });
  const warned = new Set(activeAlerts.map((a) => a.equipmentId));
  for (const eq of equipment) {
    const last = await prisma.equipmentTelemetry.findFirst({
      where: { equipmentId: eq.id, timestamp: { lte: now } },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true, powerKw: true },
    });
    const lastSignal = eq.hasProductionSignal
      ? await prisma.productionSignal.findFirst({
          where: { equipmentId: eq.id, timestamp: { lte: now } },
          orderBy: { timestamp: 'desc' },
          select: { timestamp: true, isProducing: true },
        })
      : null;
    const lastSeenAt = last?.timestamp ?? null;
    const currentPowerKw = last?.powerKw ?? 0;
    const status = deriveStatus({
      now,
      lastSeenAt,
      currentPowerKw,
      thresholds: resolveThresholds(eq),
      hasActiveWarning: warned.has(eq.id),
    });
    let productionState: string | null = null;
    if (eq.hasProductionSignal) {
      if (!lastSignal || now.getTime() - lastSignal.timestamp.getTime() > 5 * 60_000) productionState = 'NO_SIGNAL';
      else productionState = lastSignal.isProducing ? 'PRODUCING' : 'NOT_PRODUCING';
    }
    await prisma.equipment.update({
      where: { id: eq.id },
      data: {
        lastSeenAt,
        currentPowerKw: status === 'OFFLINE' ? 0 : currentPowerKw,
        status,
        productionState,
        lastProductionAt: lastSignal?.isProducing ? lastSignal.timestamp : eq.lastProductionAt,
      },
    });
  }
}

// Bir instansiya ichida takroriy sinxronizatsiyani cheklash (har so'rovda emas).
const lastSync = new Map<string, number>();
const inflight = new Map<string, Promise<void>>();
const SYNC_INTERVAL_MS = 20_000;

/** Sahifa/API so'rovlarida chaqiriladi: kerak bo'lsa ma'lumotni yangilaydi va AI Inspector'ni ishga tushiradi. */
export async function ensureFresh(organizationId: string): Promise<void> {
  const prev = lastSync.get(organizationId) ?? 0;
  if (Date.now() - prev < SYNC_INTERVAL_MS) return;
  const running = inflight.get(organizationId);
  if (running) return running;
  const p = (async () => {
    try {
      await syncOrganizationTelemetry(organizationId);
      const { runInspection } = await import('./inspector');
      await runInspection(organizationId);
      lastSync.set(organizationId, Date.now());
    } catch (err) {
      console.error('[sync] xato', err);
    } finally {
      inflight.delete(organizationId);
    }
  })();
  inflight.set(organizationId, p);
  return p;
}

/** Uskuna qo'shilganda/o'zgarganda keyingi so'rovda darhol sinxronlash uchun. */
export function invalidateSync(organizationId: string) {
  lastSync.delete(organizationId);
}

export function resetSyncThrottle() {
  lastSync.clear();
}

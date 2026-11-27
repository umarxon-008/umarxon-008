import 'server-only';
import { prisma } from '../db';
import { aggregateSeries, totalsByEquipment, totalEnergy } from '../repositories/telemetry';
import { averagePowerKw, costFor, costForBuckets, tariffAt } from '@/lib/energy';
import {
  DAY,
  HOUR,
  MAX_RANGE_DAYS,
  addZonedDays,
  hoursBetween,
  parseZonedDateInput,
  startOfZonedDay,
  zonedParts,
  zonedTimeToUtc,
  type DateRange,
  type Granularity,
} from '@/lib/time';
import { getTariffPoints } from './organization';
import type { RangeQuery } from '@/schemas/telemetry';

export interface ResolvedRange extends DateRange {
  granularity: Granularity;
  preset: RangeQuery['preset'];
  /** Tarif tarixi chegarasi tufayli boshlanish sanasi qisqartirildimi */
  clampedByPlan: boolean;
  granularityAdjusted: boolean;
}

export function resolveRange(q: RangeQuery, timezone: string, historyDays: number, now = new Date()): ResolvedRange {
  let from: Date;
  let to: Date = now;
  const todayStart = startOfZonedDay(now, timezone);
  switch (q.preset) {
    case 'today':
      from = todayStart;
      break;
    case '24h':
      from = new Date(now.getTime() - 24 * HOUR);
      break;
    case '30d':
      from = addZonedDays(todayStart, -29, timezone);
      break;
    case 'month': {
      const p = zonedParts(now, timezone);
      from = zonedTimeToUtc(p.year, p.month, 1, 0, 0, timezone);
      break;
    }
    case 'custom': {
      const f = q.from ? parseZonedDateInput(q.from, timezone) : null;
      const t = q.to ? parseZonedDateInput(q.to, timezone) : null;
      from = f ?? addZonedDays(todayStart, -6, timezone);
      to = t ? addZonedDays(t, 1, timezone) : now;
      if (to > now) to = now;
      if (from >= to) from = new Date(to.getTime() - DAY);
      break;
    }
    case '7d':
    default:
      from = addZonedDays(todayStart, -6, timezone);
  }
  let clampedByPlan = false;
  const minFrom = new Date(now.getTime() - historyDays * DAY);
  if (from < minFrom) {
    from = minFrom;
    clampedByPlan = true;
  }
  let granularity = q.granularity as Granularity;
  let granularityAdjusted = false;
  const days = (to.getTime() - from.getTime()) / DAY;
  const order: Granularity[] = ['hour', 'day', 'week', 'month'];
  while (days > MAX_RANGE_DAYS[granularity] && granularity !== 'month') {
    granularity = order[order.indexOf(granularity) + 1]!;
    granularityAdjusted = true;
  }
  return { from, to, granularity, preset: q.preset, clampedByPlan, granularityAdjusted };
}

function bucketHours(bucket: Date, granularity: Granularity, range: DateRange, timezone: string): number {
  const start = bucket < range.from ? range.from : bucket;
  let end: Date;
  if (granularity === 'hour') end = new Date(bucket.getTime() + HOUR);
  else if (granularity === 'day') end = addZonedDays(bucket, 1, timezone);
  else if (granularity === 'week') end = addZonedDays(bucket, 7, timezone);
  else {
    const p = zonedParts(bucket, timezone);
    end = zonedTimeToUtc(p.year, p.month + 1, 1, 0, 0, timezone);
  }
  if (end > range.to) end = range.to;
  return hoursBetween(start, end);
}

export async function getSeries(params: {
  organizationId: string;
  timezone: string;
  range: ResolvedRange;
  equipmentIds?: string[];
}) {
  const [rows, tariffs] = await Promise.all([
    aggregateSeries({ ...params, from: params.range.from, to: params.range.to, granularity: params.range.granularity }),
    getTariffPoints(params.organizationId),
  ]);
  return rows.map((r) => {
    const hours = bucketHours(r.bucket, params.range.granularity, params.range, params.timezone);
    const tariff = tariffAt(tariffs, r.bucket);
    return {
      bucket: r.bucket.toISOString(),
      energyKwh: r.energyKwh,
      avgPowerKw: averagePowerKw(r.energyKwh, hours),
      peakKw: r.peakKw,
      cost: tariff ? costFor(r.energyKwh, tariff.pricePerKwh) : null,
      readings: r.readings,
      demoShare: r.readings ? r.demoReadings / r.readings : 0,
    };
  });
}

export async function getMonitoringData(params: {
  organizationId: string;
  timezone: string;
  currency: string;
  range: ResolvedRange;
  equipmentIds?: string[];
  factoryId?: string;
}) {
  let equipmentIds = params.equipmentIds;
  if (params.factoryId) {
    const inFactory = await prisma.equipment.findMany({
      where: { organizationId: params.organizationId, factoryId: params.factoryId },
      select: { id: true },
    });
    const ids = inFactory.map((e) => e.id);
    equipmentIds = equipmentIds?.length ? equipmentIds.filter((id) => ids.includes(id)) : ids;
    if (equipmentIds.length === 0) equipmentIds = ['__none__'];
  }
  const [series, perEquipment, equipment, tariffs] = await Promise.all([
    getSeries({ ...params, equipmentIds }),
    totalsByEquipment({ organizationId: params.organizationId, from: params.range.from, to: params.range.to, equipmentIds }),
    prisma.equipment.findMany({
      where: { organizationId: params.organizationId, ...(equipmentIds ? { id: { in: equipmentIds } } : {}) },
      select: { id: true, name: true, code: true, currentPowerKw: true, status: true, dataSource: true },
      orderBy: { name: 'asc' },
    }),
    getTariffPoints(params.organizationId),
  ]);
  const energyKwh = series.reduce((s, b) => s + b.energyKwh, 0);
  const cost = costForBuckets(
    series.map((b) => ({ bucket: new Date(b.bucket), energyKwh: b.energyKwh })),
    tariffs,
  );
  const readings = series.reduce((s, b) => s + b.readings, 0);
  const demoReadings = series.reduce((s, b) => s + b.readings * b.demoShare, 0);
  const hours = hoursBetween(params.range.from, params.range.to);
  const byId = new Map(perEquipment.map((p) => [p.equipmentId, p]));
  const currentTariff = tariffAt(tariffs, new Date());
  return {
    range: {
      from: params.range.from.toISOString(),
      to: params.range.to.toISOString(),
      granularity: params.range.granularity,
      preset: params.range.preset,
      clampedByPlan: params.range.clampedByPlan,
      granularityAdjusted: params.range.granularityAdjusted,
    },
    currency: params.currency,
    timezone: params.timezone,
    pricePerKwh: currentTariff?.pricePerKwh ?? null,
    totals: {
      energyKwh,
      cost,
      avgPowerKw: averagePowerKw(energyKwh, hours),
      peakKw: series.reduce((m, b) => Math.max(m, b.peakKw), 0),
      currentPowerKw: equipment.filter((e) => e.status !== 'OFFLINE').reduce((s, e) => s + e.currentPowerKw, 0),
    },
    sources: { readings, demoReadings: Math.round(demoReadings), realReadings: Math.round(readings - demoReadings) },
    series,
    equipment: equipment
      .map((e) => {
        const t = byId.get(e.id);
        const eKwh = t?.energyKwh ?? 0;
        return {
          ...e,
          energyKwh: eKwh,
          avgPowerKw: t?.avgPowerKw ?? 0,
          maxPowerKw: t?.maxPowerKw ?? 0,
          readings: t?.readings ?? 0,
          cost: currentTariff ? costFor(eKwh, currentTariff.pricePerKwh) : null,
          share: energyKwh > 0 ? eKwh / energyKwh : 0,
        };
      })
      .sort((a, b) => b.energyKwh - a.energyKwh),
  };
}

export async function getTodayTotals(organizationId: string, timezone: string, now = new Date()) {
  const from = startOfZonedDay(now, timezone);
  const [t, tariffs] = await Promise.all([totalEnergy({ organizationId, from, to: now }), getTariffPoints(organizationId)]);
  const tariff = tariffAt(tariffs, now);
  return { ...t, cost: tariff ? costFor(t.energyKwh, tariff.pricePerKwh) : null, from };
}

/** Uskuna uchun so'nggi daqiqalik o'lchovlar (grafik uchun). */
export async function getRecentReadings(organizationId: string, equipmentId: string, minutes: number, now = new Date()) {
  const rows = await prisma.equipmentTelemetry.findMany({
    where: { organizationId, equipmentId, timestamp: { gt: new Date(now.getTime() - minutes * 60_000), lte: now } },
    orderBy: { timestamp: 'asc' },
    select: { timestamp: true, powerKw: true, energyKwh: true, source: true, intervalSeconds: true },
  });
  return rows.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() }));
}

export async function getExportRows(params: {
  organizationId: string;
  from: Date;
  to: Date;
  equipmentIds?: string[];
  limit?: number;
}) {
  return prisma.equipmentTelemetry.findMany({
    where: {
      organizationId: params.organizationId,
      timestamp: { gte: params.from, lt: params.to },
      ...(params.equipmentIds?.length ? { equipmentId: { in: params.equipmentIds } } : {}),
    },
    orderBy: [{ timestamp: 'asc' }],
    take: params.limit ?? 100_000,
    include: { equipment: { select: { name: true, code: true } } },
  });
}

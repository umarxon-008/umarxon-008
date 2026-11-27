import 'server-only';
import { prisma } from '../db';
import { estimateSavingsKwh, percentChange, costForBuckets } from '@/lib/energy';
import { DAY, previousRange, startOfZonedDay } from '@/lib/time';
import { aggregateSeries, hourlyProfile, totalEnergy, totalsByEquipment } from '../repositories/telemetry';
import { getTariffPoints } from './organization';
import { getSeries, type ResolvedRange } from './telemetry';
import { hasFeature } from './plans';

export async function getAnalytics(params: { organizationId: string; timezone: string; currency: string; range: ResolvedRange }) {
  const { organizationId, timezone, range } = params;
  const prev = previousRange(range);
  const [series, prevSeriesRaw, perEquipment, prevPerEquipment, equipment, tariffs, alertsDaily, advanced, org] = await Promise.all([
    getSeries({ organizationId, timezone, range }),
    aggregateSeries({ organizationId, from: prev.from, to: prev.to, granularity: 'day', timezone }),
    totalsByEquipment({ organizationId, from: range.from, to: range.to }),
    totalsByEquipment({ organizationId, from: prev.from, to: prev.to }),
    prisma.equipment.findMany({
      where: { organizationId },
      select: { id: true, name: true, code: true, category: { select: { name: true } } },
    }),
    getTariffPoints(organizationId),
    prisma.$queryRaw<{ day: Date; severity: string; n: bigint }[]>`
      SELECT (date_trunc('day', "detectedAt" AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone}) AS day, "severity"::text AS severity, COUNT(*)::bigint AS n
      FROM "Alert" WHERE "organizationId" = ${organizationId} AND "detectedAt" >= ${range.from} AND "detectedAt" < ${range.to}
      GROUP BY 1, 2 ORDER BY 1`,
    hasFeature(organizationId, 'advancedAnalytics'),
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { baselineStart: true, baselineEnd: true } }),
  ]);

  // Oldingi davr qamrovi: ma'lumot bor kunlar / davr kunlari. To'liq bo'lmasa taqqoslash chalg'itadi.
  const prevDays = Math.max(1, Math.round((prev.to.getTime() - prev.from.getTime()) / DAY));
  const prevCoverage = Math.min(1, prevSeriesRaw.filter((b) => b.readings > 0).length / prevDays);
  const previousComplete = prevCoverage >= 0.8;
  const energyKwh = series.reduce((s, b) => s + b.energyKwh, 0);
  const cost = costForBuckets(series.map((b) => ({ bucket: new Date(b.bucket), energyKwh: b.energyKwh })), tariffs);
  const prevEnergy = prevSeriesRaw.reduce((s, b) => s + b.energyKwh, 0);
  const prevCost = costForBuckets(prevSeriesRaw.map((b) => ({ bucket: b.bucket, energyKwh: b.energyKwh })), tariffs);
  const names = new Map(equipment.map((e) => [e.id, e]));
  const prevById = new Map(prevPerEquipment.map((p) => [p.equipmentId, p.energyKwh]));
  const byEquipment = perEquipment
    .map((p) => ({
      id: p.equipmentId,
      name: names.get(p.equipmentId)?.name ?? '—',
      code: names.get(p.equipmentId)?.code ?? '',
      category: names.get(p.equipmentId)?.category?.name ?? 'Kategoriyasiz',
      energyKwh: p.energyKwh,
      share: energyKwh > 0 ? p.energyKwh / energyKwh : 0,
      previousEnergyKwh: prevById.get(p.equipmentId) ?? 0,
      change: previousComplete ? percentChange(p.energyKwh, prevById.get(p.equipmentId) ?? 0) : null,
      avgPowerKw: p.avgPowerKw,
      maxPowerKw: p.maxPowerKw,
    }))
    .sort((a, b) => b.energyKwh - a.energyKwh);

  // Ogohlantirishlar dinamikasi (kunlar bo'yicha)
  const alertMap = new Map<string, { day: string; INFO: number; WARNING: number; CRITICAL: number }>();
  for (const r of alertsDaily) {
    const key = r.day.toISOString();
    const row = alertMap.get(key) ?? { day: key, INFO: 0, WARNING: 0, CRITICAL: 0 };
    row[r.severity as 'INFO' | 'WARNING' | 'CRITICAL'] = Number(r.n);
    alertMap.set(key, row);
  }

  let advancedData: null | {
    byCategory: { category: string; energyKwh: number; share: number }[];
    hourly: { hour: number; avgPowerKw: number }[];
  } = null;
  if (advanced) {
    const cat = new Map<string, number>();
    for (const e of byEquipment) cat.set(e.category, (cat.get(e.category) ?? 0) + e.energyKwh);
    advancedData = {
      byCategory: [...cat.entries()]
        .map(([category, kwh]) => ({ category, energyKwh: kwh, share: energyKwh > 0 ? kwh / energyKwh : 0 }))
        .sort((a, b) => b.energyKwh - a.energyKwh),
      hourly: await hourlyProfile({ organizationId, from: range.from, to: range.to, timezone }),
    };
  }

  // Taxminiy tejash — faqat baseline davri belgilangan bo'lsa
  let savings: null | { savingsKwh: number; baselineDailyKwh: number; method: string; baselineStart: string; baselineEnd: string } = null;
  if (org.baselineStart && org.baselineEnd) {
    const baselineEnd = new Date(org.baselineEnd.getTime() + DAY);
    const b = await totalEnergy({ organizationId, from: org.baselineStart, to: baselineEnd });
    const baselineDays = (baselineEnd.getTime() - org.baselineStart.getTime()) / DAY;
    const currentDays = (range.to.getTime() - range.from.getTime()) / DAY;
    const s = estimateSavingsKwh({ baselineEnergyKwh: b.energyKwh, baselineDays, currentEnergyKwh: energyKwh, currentDays });
    if (s !== null) {
      savings = {
        savingsKwh: s,
        baselineDailyKwh: b.energyKwh / baselineDays,
        method:
          'Tejash = (baseline davrining kunlik o‘rtacha iste’moli × joriy davr kunlari) − joriy davr iste’moli. Ishlab chiqarish hajmi, ish kunlari soni va ob-havo hisobga olinmagan — natija taxminiy.',
        baselineStart: org.baselineStart.toISOString(),
        baselineEnd: org.baselineEnd.toISOString(),
      };
    }
  }

  return {
    range: { from: range.from.toISOString(), to: range.to.toISOString(), granularity: range.granularity, preset: range.preset, clampedByPlan: range.clampedByPlan },
    previousRange: { from: prev.from.toISOString(), to: prev.to.toISOString() },
    currency: params.currency,
    totals: {
      energyKwh,
      cost,
      previousEnergyKwh: prevEnergy,
      previousCost: prevCost,
      energyChange: previousComplete ? percentChange(energyKwh, prevEnergy) : null,
      costChange: previousComplete ? percentChange(cost, prevCost) : null,
      previousCoverage: prevCoverage,
      previousComplete,
      demoShare: series.reduce((s, b) => s + b.readings * b.demoShare, 0) / Math.max(1, series.reduce((s, b) => s + b.readings, 0)),
    },
    series,
    byEquipment,
    alertsTrend: [...alertMap.values()],
    advancedAvailable: advanced,
    advanced: advancedData,
    savings,
    todayStart: startOfZonedDay(new Date(), timezone).toISOString(),
  };
}

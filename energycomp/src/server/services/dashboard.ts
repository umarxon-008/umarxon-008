import 'server-only';
import { prisma } from '../db';
import { addZonedDays, startOfZonedDay } from '@/lib/time';
import { getSeries, getTodayTotals } from './telemetry';
import { totalsByEquipment } from '../repositories/telemetry';
import { readEvidence } from './inspector';

export async function getDashboard(organizationId: string, timezone: string, now = new Date()) {
  const todayStart = startOfZonedDay(now, timezone);
  const [today, equipment, openAlerts, alertCounts, top, analyses, series] = await Promise.all([
    getTodayTotals(organizationId, timezone, now),
    prisma.equipment.findMany({
      where: { organizationId },
      select: { id: true, name: true, code: true, status: true, currentPowerKw: true, nominalPowerKw: true, dataSource: true, lastSeenAt: true },
      orderBy: { currentPowerKw: 'desc' },
    }),
    prisma.alert.findMany({
      where: { organizationId, status: { in: ['NEW', 'ACKNOWLEDGED'] } },
      include: { equipment: { select: { id: true, name: true } } },
      orderBy: [{ detectedAt: 'desc' }],
      take: 5,
    }),
    prisma.alert.groupBy({
      by: ['severity'],
      where: { organizationId, status: { in: ['NEW', 'ACKNOWLEDGED'] } },
      _count: { _all: true },
    }),
    totalsByEquipment({ organizationId, from: todayStart, to: now }),
    prisma.aIAnalysis.count({ where: { organizationId } }),
    getSeries({
      organizationId,
      timezone,
      range: {
        from: new Date(now.getTime() - 24 * 3_600_000),
        to: now,
        granularity: 'hour',
        preset: '24h',
        clampedByPlan: false,
        granularityAdjusted: false,
      },
    }),
  ]);
  const statusCounts = { RUNNING: 0, STANDBY: 0, STOPPED: 0, WARNING: 0, OFFLINE: 0 } as Record<string, number>;
  for (const e of equipment) statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
  const names = new Map(equipment.map((e) => [e.id, e]));
  const lastUpdate = equipment.reduce<Date | null>((m, e) => (e.lastSeenAt && (!m || e.lastSeenAt > m) ? e.lastSeenAt : m), null);
  const severity = Object.fromEntries(alertCounts.map((c) => [c.severity, c._count._all]));
  const yesterdayStart = addZonedDays(todayStart, -1, timezone);
  return {
    generatedAt: now.toISOString(),
    lastDataAt: lastUpdate?.toISOString() ?? null,
    todayStart: todayStart.toISOString(),
    yesterdayStart: yesterdayStart.toISOString(),
    currentPowerKw: equipment.filter((e) => e.status !== 'OFFLINE').reduce((s, e) => s + e.currentPowerKw, 0),
    todayEnergyKwh: today.energyKwh,
    todayCost: today.cost,
    dataSources: {
      demoEquipment: equipment.filter((e) => e.dataSource === 'DEMO').length,
      realEquipment: equipment.filter((e) => e.dataSource === 'REAL').length,
      todayDemoReadings: today.demoReadings,
      todayReadings: today.readings,
    },
    equipmentCount: equipment.length,
    statusCounts,
    alerts: {
      open: alertCounts.reduce((s, c) => s + c._count._all, 0),
      critical: severity.CRITICAL ?? 0,
      warning: severity.WARNING ?? 0,
      info: severity.INFO ?? 0,
      latest: openAlerts.map((a) => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        status: a.status,
        rule: a.rule,
        recommendation: a.recommendation,
        confidence: a.confidence,
        detectedAt: a.detectedAt.toISOString(),
        equipment: a.equipment,
        evidence: readEvidence(a.evidence).items.slice(0, 3),
        conditionActive: a.conditionActive,
        source: a.source,
      })),
    },
    analysesTotal: analyses,
    topConsumers: top
      .sort((a, b) => b.energyKwh - a.energyKwh)
      .slice(0, 5)
      .map((t) => ({
        id: t.equipmentId,
        name: names.get(t.equipmentId)?.name ?? '—',
        code: names.get(t.equipmentId)?.code ?? '',
        energyKwh: t.energyKwh,
        share: today.energyKwh > 0 ? t.energyKwh / today.energyKwh : 0,
      })),
    equipment: equipment.map((e) => ({ ...e, lastSeenAt: e.lastSeenAt?.toISOString() ?? null })),
    series24h: series,
  };
}

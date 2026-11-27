import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '../db';
import { writeAudit } from '../audit';
import { conflict, notFound } from '../errors';
import type { AuthContext } from '../auth/context';
import { runRules, type Detection, type Evidence } from '../inspector/rules';
import { analyzeWithFallback } from '../providers/ai';
import type { AIAnalysisInput } from '../providers/ai/types';
import { resolveThresholds } from '@/lib/status';
import { SEVERITY_LABELS } from '@/lib/labels';
import { notifyMembers } from './notifications';
import { assertAiQuota, hasFeature } from './plans';
import { refreshEquipmentSnapshots } from './telemetry-sync';
import type { z } from 'zod';
import type { alertListQuerySchema } from '@/schemas/alerts';

const LOOKBACK_MS = 2 * 3_600_000;
const COOLDOWN_MS = 60 * 60_000;
const HOUR = 3_600_000;

interface StoredDetails {
  facts: string[];
  assumptions: string[];
  items: Evidence[];
}

function evidenceJson(d: Detection): Prisma.InputJsonValue {
  return { items: d.evidence, facts: d.facts, assumptions: d.assumptions } as unknown as Prisma.InputJsonValue;
}

export function readEvidence(value: Prisma.JsonValue): StoredDetails {
  const v = (value ?? {}) as Partial<StoredDetails>;
  return {
    items: Array.isArray(v.items) ? v.items : [],
    facts: Array.isArray(v.facts) ? v.facts : [],
    assumptions: Array.isArray(v.assumptions) ? v.assumptions : [],
  };
}

/** O'tgan 7 kundagi "ishlash" holatidagi o'rtacha quvvat — baseline belgilanmaganda ishlatiladi. */
async function historicalBaseline(equipmentId: string, standbyKw: number, now: Date): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ avg: number | null; n: bigint }[]>`
    SELECT (SUM("powerKw" * "intervalSeconds") / NULLIF(SUM("intervalSeconds"),0))::float8 AS avg, COUNT(*)::bigint AS n
    FROM "EquipmentTelemetry"
    WHERE "equipmentId" = ${equipmentId}
      AND "timestamp" >= ${new Date(now.getTime() - 7 * 24 * HOUR)}
      AND "timestamp" < ${new Date(now.getTime() - 3 * HOUR)}
      AND "powerKw" >= ${standbyKw}`;
  const r = rows[0];
  if (!r || r.avg === null || Number(r.n) < 50) return null;
  return r.avg;
}

/**
 * Tashkilot uskunalarini qoidalar bo'yicha tekshiradi va ogohlantirishlarni yaratadi/yangilaydi.
 * Bir xil (uskuna, qoida) bo'yicha ochiq alert bo'lsa — dublikat yaratilmaydi.
 */
export async function runInspection(organizationId: string, now = new Date(), actorId: string | null = null) {
  const equipment = await prisma.equipment.findMany({ where: { organizationId } });
  let created = 0;
  let updated = 0;
  for (const eq of equipment) {
    const [telemetry, signals] = await Promise.all([
      prisma.equipmentTelemetry.findMany({
        where: { equipmentId: eq.id, timestamp: { gt: new Date(now.getTime() - LOOKBACK_MS), lte: now } },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true, powerKw: true, intervalSeconds: true, source: true },
      }),
      prisma.productionSignal.findMany({
        where: { equipmentId: eq.id, timestamp: { gt: new Date(now.getTime() - 30 * 60_000), lte: now } },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true, isProducing: true },
      }),
    ]);
    const lastSeen = await prisma.equipmentTelemetry.findFirst({
      where: { equipmentId: eq.id, timestamp: { lte: now } },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    const baseline = eq.baselinePowerKw ? null : await historicalBaseline(eq.id, resolveThresholds(eq).standbyKw, now);
    const detections = runRules({
      now,
      equipment: { ...eq, lastSeenAt: lastSeen?.timestamp ?? null },
      telemetry,
      signals,
      historicalBaselineKw: baseline,
    });
    const source = telemetry.some((t) => t.source === 'REAL') ? 'REAL' : eq.dataSource;

    const open = await prisma.alert.findMany({
      where: { equipmentId: eq.id, status: { in: ['NEW', 'ACKNOWLEDGED'] } },
    });
    const triggered = new Set(detections.map((d) => d.rule));
    // Holati tugagan ochiq alertlar
    const cleared = open.filter((a) => !triggered.has(a.rule) && a.conditionActive).map((a) => a.id);
    if (cleared.length) {
      await prisma.alert.updateMany({ where: { id: { in: cleared } }, data: { conditionActive: false, lastCheckedAt: now } });
    }

    for (const d of detections) {
      const existing = open.find((a) => a.rule === d.rule);
      if (existing) {
        await prisma.alert.update({
          where: { id: existing.id },
          data: {
            evidence: evidenceJson(d),
            explanation: d.explanation,
            severity: d.severity,
            title: d.title,
            windowEnd: d.windowEnd,
            conditionActive: true,
            lastCheckedAt: now,
          },
        });
        updated++;
        continue;
      }
      const recentlyClosed = await prisma.alert.findFirst({
        where: {
          equipmentId: eq.id,
          rule: d.rule,
          status: { in: ['RESOLVED', 'DISMISSED'] },
          reviewedAt: { gt: new Date(now.getTime() - COOLDOWN_MS) },
        },
      });
      if (recentlyClosed) continue;

      await prisma.$transaction(async (tx) => {
        const alert = await tx.alert.create({
          data: {
            organizationId,
            equipmentId: eq.id,
            rule: d.rule,
            title: d.title,
            severity: d.severity,
            explanation: d.explanation,
            recommendation: d.recommendation,
            evidence: evidenceJson(d),
            confidence: d.confidence,
            source,
            windowStart: d.windowStart,
            windowEnd: d.windowEnd,
            detectedAt: now,
            lastCheckedAt: now,
          },
        });
        await tx.alertEvent.create({ data: { organizationId, alertId: alert.id, toStatus: 'NEW', actorId, note: 'Qoidaga asoslangan aniqlash' } });
        await writeAudit(
          { organizationId, actorId, action: 'alert.created', entityType: 'Alert', entityId: alert.id, metadata: { rule: d.rule, severity: d.severity, equipmentId: eq.id, source } },
          tx,
        );
        await notifyMembers(
          organizationId,
          {
            type: 'ALERT',
            severity: d.severity,
            title: `${SEVERITY_LABELS[d.severity]}: ${d.title}`,
            body: d.explanation,
            link: `/app/ai-inspector?alert=${alert.id}`,
          },
          tx,
        );
      });
      created++;
    }
  }
  await refreshEquipmentSnapshots(organizationId, now);
  return { created, updated, checked: equipment.length };
}

export type AlertListQuery = z.infer<typeof alertListQuerySchema>;

export async function listAlerts(organizationId: string, q: AlertListQuery) {
  const where: Prisma.AlertWhereInput = { organizationId };
  if (q.status === 'OPEN') where.status = { in: ['NEW', 'ACKNOWLEDGED'] };
  else if (q.status !== 'ALL') where.status = q.status;
  if (q.severity) where.severity = q.severity;
  if (q.equipmentId) where.equipmentId = q.equipmentId;
  if (q.rule) where.rule = q.rule;
  const [items, total, counts] = await Promise.all([
    prisma.alert.findMany({
      where,
      include: { equipment: { select: { id: true, name: true, code: true } } },
      orderBy: [{ detectedAt: 'desc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.alert.count({ where }),
    prisma.alert.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } }),
  ]);
  return {
    items: items.map((a) => ({ ...a, details: readEvidence(a.evidence) })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    countsByStatus: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
  };
}

export async function getAlert(organizationId: string, id: string) {
  const alert = await prisma.alert.findFirst({
    where: { id, organizationId },
    include: {
      equipment: { select: { id: true, name: true, code: true, dataSource: true, hasProductionSignal: true } },
      events: { orderBy: { createdAt: 'asc' } },
      aiAnalyses: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!alert) throw notFound('Ogohlantirish topilmadi');
  const actorIds = [...new Set([...alert.events.map((e) => e.actorId), alert.reviewedById].filter(Boolean) as string[])];
  const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const names = Object.fromEntries(actors.map((u) => [u.id, u.name]));
  return {
    ...alert,
    details: readEvidence(alert.evidence),
    reviewedByName: alert.reviewedById ? (names[alert.reviewedById] ?? null) : null,
    events: alert.events.map((e) => ({ ...e, actorName: e.actorId ? (names[e.actorId] ?? 'Noma’lum') : 'Tizim' })),
  };
}

const TRANSITIONS: Record<string, string[]> = {
  NEW: ['ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'],
  ACKNOWLEDGED: ['RESOLVED', 'DISMISSED', 'NEW'],
  RESOLVED: ['NEW'],
  DISMISSED: ['NEW'],
};

export async function updateAlertStatus(
  ctx: AuthContext,
  id: string,
  next: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED',
  note?: string,
) {
  const alert = await prisma.alert.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!alert) throw notFound('Ogohlantirish topilmadi');
  if (!TRANSITIONS[alert.status]?.includes(next)) {
    throw conflict(`Holatni "${alert.status}" dan "${next}" ga o'zgartirib bo'lmaydi`);
  }
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.alert.update({
      where: { id },
      data: { status: next, reviewedById: ctx.user.id, reviewedAt: now },
    });
    await tx.alertEvent.create({
      data: { organizationId: ctx.org.id, alertId: id, actorId: ctx.user.id, fromStatus: alert.status, toStatus: next, note: note ?? null },
    });
    await writeAudit(
      { organizationId: ctx.org.id, actorId: ctx.user.id, action: 'alert.status_changed', entityType: 'Alert', entityId: id, metadata: { from: alert.status, to: next, note: note ?? null } },
      tx,
    );
  });
  await refreshEquipmentSnapshots(ctx.org.id);
  return getAlert(ctx.org.id, id);
}

async function stats24h(equipmentId: string, now: Date) {
  const rows = await prisma.$queryRaw<{ energy: number | null; avgp: number | null; maxp: number | null; n: bigint }[]>`
    SELECT SUM("energyKwh")::float8 AS energy,
           (SUM("powerKw" * "intervalSeconds") / NULLIF(SUM("intervalSeconds"),0))::float8 AS avgp,
           MAX("powerKw")::float8 AS maxp, COUNT(*)::bigint AS n
    FROM "EquipmentTelemetry"
    WHERE "equipmentId" = ${equipmentId} AND "timestamp" > ${new Date(now.getTime() - 24 * HOUR)} AND "timestamp" <= ${now}`;
  const r = rows[0];
  return { energyKwh: r?.energy ?? 0, avgPowerKw: r?.avgp ?? 0, maxPowerKw: r?.maxp ?? 0, readings: Number(r?.n ?? 0) };
}

/** AI tahlil: alert yoki uskuna bo'yicha. LLM faqat Pro (advancedAi) va kalit sozlangan bo'lsa ishlatiladi. */
export async function analyze(ctx: AuthContext, target: { alertId?: string; equipmentId?: string }) {
  await assertAiQuota(ctx.org.id, ctx.org.timezone);
  const alert = target.alertId ? await prisma.alert.findFirst({ where: { id: target.alertId, organizationId: ctx.org.id } }) : null;
  if (target.alertId && !alert) throw notFound('Ogohlantirish topilmadi');
  const equipmentId = alert?.equipmentId ?? target.equipmentId;
  if (!equipmentId) throw notFound('Uskuna ko‘rsatilmagan');
  const eq = await prisma.equipment.findFirst({ where: { id: equipmentId, organizationId: ctx.org.id }, include: { category: true } });
  if (!eq) throw notFound('Uskuna topilmadi');
  const now = new Date();
  const details = alert ? readEvidence(alert.evidence) : null;
  const input: AIAnalysisInput = {
    equipment: {
      name: eq.name,
      category: eq.category?.name ?? null,
      nominalPowerKw: eq.nominalPowerKw,
      baselinePowerKw: eq.baselinePowerKw,
      hasProductionSignal: eq.hasProductionSignal,
      dataSource: eq.dataSource,
      status: eq.status,
    },
    alert:
      alert && details
        ? {
            rule: alert.rule,
            title: alert.title,
            severity: alert.severity,
            explanation: alert.explanation,
            recommendation: alert.recommendation,
            confidence: alert.confidence,
            evidence: details.items,
            facts: details.facts,
            assumptions: details.assumptions,
            windowStart: alert.windowStart.toISOString(),
            windowEnd: alert.windowEnd.toISOString(),
          }
        : null,
    stats24h: await stats24h(eq.id, now),
    timezone: ctx.org.timezone,
  };
  const allowLLM = await hasFeature(ctx.org.id, 'advancedAi');
  const outcome = await analyzeWithFallback(input, allowLLM);
  const record = await prisma.aIAnalysis.create({
    data: {
      organizationId: ctx.org.id,
      equipmentId: eq.id,
      alertId: alert?.id ?? null,
      provider: outcome.result.provider,
      model: outcome.result.model,
      status: outcome.status,
      input: input as unknown as Prisma.InputJsonValue,
      output: outcome.result as unknown as Prisma.InputJsonValue,
      confidence: outcome.result.confidence.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
      errorMessage: outcome.errorMessage,
      requestedById: ctx.user.id,
    },
  });
  await writeAudit({
    organizationId: ctx.org.id,
    actorId: ctx.user.id,
    action: 'ai.analysis_created',
    entityType: 'AIAnalysis',
    entityId: record.id,
    metadata: { provider: outcome.result.provider, status: outcome.status, alertId: alert?.id ?? null, equipmentId: eq.id },
  });
  return record;
}

export async function setAnalysisFeedback(ctx: AuthContext, id: string, feedback: 'HELPFUL' | 'NOT_HELPFUL') {
  const a = await prisma.aIAnalysis.findFirst({ where: { id, organizationId: ctx.org.id } });
  if (!a) throw notFound('Tahlil topilmadi');
  const updated = await prisma.aIAnalysis.update({
    where: { id },
    data: { feedback, feedbackById: ctx.user.id, feedbackAt: new Date() },
  });
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'ai.feedback', entityType: 'AIAnalysis', entityId: id, metadata: { feedback } });
  return updated;
}

export async function listAnalyses(organizationId: string, opts: { equipmentId?: string; take?: number } = {}) {
  return prisma.aIAnalysis.findMany({
    where: { organizationId, ...(opts.equipmentId ? { equipmentId: opts.equipmentId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: opts.take ?? 20,
    include: { equipment: { select: { id: true, name: true } } },
  });
}

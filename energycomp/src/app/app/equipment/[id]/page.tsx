import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageContext } from '@/server/auth/context';
import { prisma } from '@/server/db';
import { equipmentRepo } from '@/server/repositories/equipment';
import { listFactories } from '@/server/services/factory';
import { listCategories } from '@/server/services/equipment';
import { listAnalyses } from '@/server/services/inspector';
import { getSeries } from '@/server/services/telemetry';
import { totalsByEquipment } from '@/server/repositories/telemetry';
import { addZonedDays, startOfZonedDay } from '@/lib/time';
import { can } from '@/lib/permissions';
import { EquipmentDetail, type DetailEquipment } from '@/features/equipment/equipment-detail';
import type { AnalysisRecord } from '@/features/inspector/analysis-card';

export const metadata: Metadata = { title: 'Uskuna' };

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requirePageContext();
  const eq = await equipmentRepo.findById(ctx.org.id, id);
  if (!eq) notFound();
  const now = new Date();
  const todayStart = startOfZonedDay(now, ctx.org.timezone);
  const [week, today, alerts, analyses, factories, categories] = await Promise.all([
    getSeries({
      organizationId: ctx.org.id,
      timezone: ctx.org.timezone,
      equipmentIds: [id],
      range: { from: addZonedDays(todayStart, -6, ctx.org.timezone), to: now, granularity: 'day', preset: '7d', clampedByPlan: false, granularityAdjusted: false },
    }),
    totalsByEquipment({ organizationId: ctx.org.id, from: todayStart, to: now, equipmentIds: [id] }),
    prisma.alert.findMany({ where: { organizationId: ctx.org.id, equipmentId: id }, orderBy: { detectedAt: 'desc' }, take: 6 }),
    listAnalyses(ctx.org.id, { equipmentId: id, take: 5 }),
    listFactories(ctx.org.id),
    listCategories(ctx.org.id),
  ]);
  const json = <T,>(v: unknown) => JSON.parse(JSON.stringify(v)) as T;
  return (
    <EquipmentDetail
      equipment={json<DetailEquipment>(eq)}
      week={week}
      todayKwh={today[0]?.energyKwh ?? 0}
      alerts={json(alerts.map((a) => ({ id: a.id, title: a.title, severity: a.severity, status: a.status, detectedAt: a.detectedAt })))}
      analyses={json<AnalysisRecord[]>(analyses)}
      factories={factories.map((f) => ({ id: f.id, name: f.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      timezone={ctx.org.timezone}
      currency={ctx.org.currency}
      userId={ctx.user.id}
      perms={{
        write: can(ctx.role, 'equipment.write'),
        analyze: can(ctx.role, 'ai.analyze'),
        feedback: can(ctx.role, 'ai.feedback'),
        controlRequest: can(ctx.role, 'control.request'),
        controlReview: can(ctx.role, 'control.review'),
      }}
    />
  );
}

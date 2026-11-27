import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { listFactories } from '@/server/services/factory';
import { equipmentRepo } from '@/server/repositories/equipment';
import { getOrgPlan } from '@/server/services/plans';
import { toZonedDateInput } from '@/lib/time';
import { MonitoringView } from '@/features/monitoring/monitoring-view';

export const metadata: Metadata = { title: 'Energy Monitoring' };

export default async function MonitoringPage() {
  const ctx = await requirePageContext();
  const [factories, equipment, plan] = await Promise.all([listFactories(ctx.org.id), equipmentRepo.list(ctx.org.id), getOrgPlan(ctx.org.id)]);
  return (
    <MonitoringView
      factories={factories.map((f) => ({ id: f.id, name: f.name }))}
      equipmentOptions={equipment.map((e) => ({ id: e.id, name: e.name, code: e.code, factoryId: e.factoryId }))}
      timezone={ctx.org.timezone}
      today={toZonedDateInput(new Date(), ctx.org.timezone)}
      historyDays={plan.historyDays}
    />
  );
}

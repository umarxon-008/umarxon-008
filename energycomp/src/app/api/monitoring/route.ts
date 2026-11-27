import { ok, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { rangeQuerySchema } from '@/schemas/telemetry';
import { getOrgPlan } from '@/server/services/plans';
import { getMonitoringData, resolveRange } from '@/server/services/telemetry';
import { ensureFresh } from '@/server/services/telemetry-sync';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext();
  const q = parseQuery(req, rangeQuerySchema);
  await ensureFresh(ctx.org.id);
  const plan = await getOrgPlan(ctx.org.id);
  const range = resolveRange(q, ctx.org.timezone, plan.historyDays);
  const equipmentIds = q.equipmentId ? (Array.isArray(q.equipmentId) ? q.equipmentId : [q.equipmentId]) : undefined;
  return ok(
    await getMonitoringData({
      organizationId: ctx.org.id,
      timezone: ctx.org.timezone,
      currency: ctx.org.currency,
      range,
      equipmentIds,
      factoryId: q.factoryId,
    }),
  );
});

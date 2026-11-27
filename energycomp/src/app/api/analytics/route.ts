import { ok, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { rangeQuerySchema } from '@/schemas/telemetry';
import { getAnalytics } from '@/server/services/analytics';
import { getOrgPlan } from '@/server/services/plans';
import { resolveRange } from '@/server/services/telemetry';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext();
  const q = parseQuery(req, rangeQuerySchema);
  const plan = await getOrgPlan(ctx.org.id);
  const range = resolveRange(q, ctx.org.timezone, plan.historyDays);
  return ok(await getAnalytics({ organizationId: ctx.org.id, timezone: ctx.org.timezone, currency: ctx.org.currency, range }));
});

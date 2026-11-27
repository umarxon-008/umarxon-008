import { ok, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { serverEnv } from '@/server/env';
import { getAiQuota, getOrgSubscription, getUsage, listPlans } from '@/server/services/plans';

export const GET = route(async () => {
  const ctx = await requireOrgContext('billing.view');
  const [subscription, usage, plans, aiQuota] = await Promise.all([
    getOrgSubscription(ctx.org.id),
    getUsage(ctx.org.id),
    listPlans(),
    getAiQuota(ctx.org.id, ctx.org.timezone),
  ]);
  return ok({ subscription, usage, plans, aiQuota, paymentConfigured: serverEnv.paymentConfigured });
});

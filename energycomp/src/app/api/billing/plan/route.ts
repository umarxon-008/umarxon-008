import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { changePlanSchema } from '@/schemas/plans';
import { changePlanDemo } from '@/server/services/billing';

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('billing.manage');
  const { planKey } = await parseJson(req, changePlanSchema);
  return ok(await changePlanDemo(ctx, planKey));
});

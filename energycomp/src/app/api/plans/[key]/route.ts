import { ok, parseJson, route } from '@/server/api';
import { requireUser } from '@/server/auth/context';
import { planUpdateSchema } from '@/schemas/plans';
import { updatePlan } from '@/server/services/billing';

export const PUT = route<{ key: string }>(async (req, { key }) => {
  const ctx = await requireUser();
  return ok(await updatePlan(ctx, key, await parseJson(req, planUpdateSchema)));
});

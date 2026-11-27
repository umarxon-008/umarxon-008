import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { baselineSchema } from '@/schemas/organization';
import { setBaseline } from '@/server/services/organization';

export const PUT = route(async (req) => {
  const ctx = await requireOrgContext('org.update');
  await setBaseline(ctx, await parseJson(req, baselineSchema));
  return ok({ saved: true });
});

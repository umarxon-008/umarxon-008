import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { factorySchema } from '@/schemas/organization';
import { createFactory, listFactories } from '@/server/services/factory';

export const GET = route(async () => {
  const ctx = await requireOrgContext();
  return ok(await listFactories(ctx.org.id));
});

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('factory.write');
  return ok(await createFactory(ctx, await parseJson(req, factorySchema)), { status: 201 });
});

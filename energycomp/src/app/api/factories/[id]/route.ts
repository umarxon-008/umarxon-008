import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { factorySchema } from '@/schemas/organization';
import { deleteFactory, updateFactory } from '@/server/services/factory';

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext('factory.write');
  return ok(await updateFactory(ctx, id, await parseJson(req, factorySchema)));
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext('factory.delete');
  await deleteFactory(ctx, id);
  return ok({ deleted: true });
});

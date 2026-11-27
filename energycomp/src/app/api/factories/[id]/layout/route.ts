import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { mapLayoutSchema } from '@/schemas/organization';
import { getMapLayout, updateMapLayout } from '@/server/services/factory';

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext();
  return ok(await getMapLayout(ctx.org.id, id));
});

export const PUT = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext('map.write');
  return ok(await updateMapLayout(ctx, id, await parseJson(req, mapLayoutSchema)));
});

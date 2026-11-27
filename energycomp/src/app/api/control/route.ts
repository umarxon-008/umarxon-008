import { z } from 'zod';
import { ok, parseJson, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { controlRequestSchema } from '@/schemas/alerts';
import { getControlStatus, listControlRequests, requestControl } from '@/server/services/control';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext();
  const { equipmentId } = parseQuery(req, z.object({ equipmentId: z.string().max(40).optional() }));
  const [status, requests] = await Promise.all([getControlStatus(ctx.org.id), listControlRequests(ctx.org.id, equipmentId)]);
  return ok({ status, requests });
});

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('control.request');
  const data = await parseJson(req, controlRequestSchema);
  return ok(await requestControl(ctx, data), { status: 201 });
});

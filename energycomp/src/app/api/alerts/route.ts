import { ok, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { alertListQuerySchema } from '@/schemas/alerts';
import { listAlerts } from '@/server/services/inspector';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext();
  return ok(await listAlerts(ctx.org.id, parseQuery(req, alertListQuerySchema)));
});

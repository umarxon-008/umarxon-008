import { z } from 'zod';
import { ok, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { listAuditLogs } from '@/server/services/audit-log';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext('audit.view');
  const q = parseQuery(req, z.object({ page: z.coerce.number().int().min(1).default(1), action: z.string().max(40).optional() }));
  return ok(await listAuditLogs(ctx.org.id, q));
});

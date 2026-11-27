import { z } from 'zod';
import { ok, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { listNotifications } from '@/server/services/notifications';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext();
  const q = parseQuery(
    req,
    z.object({ unread: z.enum(['1', '0']).optional(), page: z.coerce.number().int().min(1).default(1) }),
  );
  return ok(await listNotifications(ctx.user.id, ctx.org.id, { unreadOnly: q.unread === '1', page: q.page }));
});

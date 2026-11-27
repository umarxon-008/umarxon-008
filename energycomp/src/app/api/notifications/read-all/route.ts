import { ok, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { markAllRead } from '@/server/services/notifications';

export const POST = route(async () => {
  const ctx = await requireOrgContext();
  return ok({ updated: await markAllRead(ctx.user.id, ctx.org.id) });
});

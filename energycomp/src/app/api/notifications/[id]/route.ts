import { ok, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { markRead } from '@/server/services/notifications';

export const PATCH = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext();
  await markRead(ctx.user.id, ctx.org.id, id);
  return ok({ read: true });
});

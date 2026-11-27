import { ok, route } from '@/server/api';
import { listSessions, revokeOtherSessions } from '@/server/services/auth';
import { requireUser } from '@/server/auth/context';

export const GET = route(async () => {
  const ctx = await requireUser();
  const sessions = await listSessions(ctx.user.id);
  // id — token hash; klientga faqat "joriy" belgisi bilan qaytaramiz
  return ok(sessions.map((s) => ({ ...s, id: s.id.slice(0, 8), current: s.id === ctx.sessionId })));
});

export const DELETE = route(async () => {
  const ctx = await requireUser();
  return ok({ revoked: await revokeOtherSessions(ctx.user.id, ctx.sessionId) });
});

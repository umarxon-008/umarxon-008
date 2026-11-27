import { ok, parseJson, route } from '@/server/api';
import { checkRateLimit } from '@/server/rate-limit';
import { changePasswordSchema } from '@/schemas/auth';
import { changePassword } from '@/server/services/auth';
import { requireUser } from '@/server/auth/context';

export const POST = route(async (req) => {
  const ctx = await requireUser();
  checkRateLimit(`chpw:${ctx.user.id}`, 10, 15 * 60_000);
  const input = await parseJson(req, changePasswordSchema);
  await changePassword(ctx.user.id, ctx.sessionId, input.currentPassword, input.password);
  return ok({ changed: true });
});

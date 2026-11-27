import { clientIp, ok, parseJson, route } from '@/server/api';
import { checkRateLimit } from '@/server/rate-limit';
import { resetPasswordSchema } from '@/schemas/auth';
import { resetPassword } from '@/server/services/auth';

export const POST = route(async (req) => {
  checkRateLimit(`reset:${clientIp(req)}`, 10, 15 * 60_000);
  const { token, password } = await parseJson(req, resetPasswordSchema);
  await resetPassword(token, password);
  return ok({ reset: true });
});

import { clientIp, ok, parseJson, route } from '@/server/api';
import { checkRateLimit } from '@/server/rate-limit';
import { forgotPasswordSchema } from '@/schemas/auth';
import { requestPasswordReset } from '@/server/services/auth';
import { serverEnv } from '@/server/env';

export const POST = route(async (req) => {
  checkRateLimit(`forgot:${clientIp(req)}`, 5, 15 * 60_000);
  const { email } = await parseJson(req, forgotPasswordSchema);
  const res = await requestPasswordReset(email);
  return ok({ ...res, emailConfigured: serverEnv.emailConfigured });
});

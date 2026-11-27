import { clientIp, ok, parseJson, route } from '@/server/api';
import { checkRateLimit } from '@/server/rate-limit';
import { loginSchema } from '@/schemas/auth';
import { loginUser } from '@/server/services/auth';

export const POST = route(async (req) => {
  const input = await parseJson(req, loginSchema);
  checkRateLimit(`login:ip:${clientIp(req)}`, 30, 15 * 60_000);
  checkRateLimit(`login:email:${input.email}`, 10, 15 * 60_000);
  return ok(await loginUser(input));
});

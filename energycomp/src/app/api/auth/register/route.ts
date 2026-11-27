import { clientIp, ok, parseJson, route } from '@/server/api';
import { checkRateLimit } from '@/server/rate-limit';
import { registerSchema } from '@/schemas/auth';
import { registerUser } from '@/server/services/auth';

export const POST = route(async (req) => {
  checkRateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000);
  const input = await parseJson(req, registerSchema);
  return ok(await registerUser(input), { status: 201 });
});

import { z } from 'zod';
import { clientIp, ok, parseJson, route } from '@/server/api';
import { checkRateLimit } from '@/server/rate-limit';
import { writeAudit } from '@/server/audit';

const schema = z.object({
  name: z.string().trim().min(2, 'Ismingizni kiriting').max(100),
  email: z.string().trim().pipe(z.email("Email manzili noto'g'ri")),
  message: z.string().trim().min(10, 'Xabar kamida 10 belgidan iborat bo‘lsin').max(2000),
});

export const POST = route(async (req) => {
  const ip = clientIp(req);
  checkRateLimit(`contact:${ip}`, 5, 60 * 60_000);
  const data = await parseJson(req, schema);
  await writeAudit({ action: 'contact.message', entityType: 'Contact', metadata: data, ip });
  return ok({ received: true });
});

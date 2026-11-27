import { z } from 'zod';
import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { checkRateLimit } from '@/server/rate-limit';
import { analyze } from '@/server/services/inspector';

const schema = z
  .object({ alertId: z.string().max(60).optional(), equipmentId: z.string().max(40).optional() })
  .refine((v) => v.alertId || v.equipmentId, { message: 'alertId yoki equipmentId kerak' });

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('ai.analyze');
  checkRateLimit(`ai:${ctx.user.id}`, 10, 60_000);
  return ok(await analyze(ctx, await parseJson(req, schema)), { status: 201 });
});

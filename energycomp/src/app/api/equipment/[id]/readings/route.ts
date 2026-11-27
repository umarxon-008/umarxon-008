import { z } from 'zod';
import { ok, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { getEquipment } from '@/server/services/equipment';
import { getRecentReadings } from '@/server/services/telemetry';
import { ensureFresh } from '@/server/services/telemetry-sync';

export const GET = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext();
  const { minutes } = parseQuery(req, z.object({ minutes: z.coerce.number().int().min(5).max(1440).default(60) }));
  await ensureFresh(ctx.org.id);
  const [equipment, readings] = await Promise.all([getEquipment(ctx, id), getRecentReadings(ctx.org.id, id, minutes)]);
  return ok({ equipment, readings });
});

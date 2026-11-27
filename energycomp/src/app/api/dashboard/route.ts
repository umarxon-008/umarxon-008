import { ok, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { getDashboard } from '@/server/services/dashboard';
import { ensureFresh } from '@/server/services/telemetry-sync';

export const GET = route(async () => {
  const ctx = await requireOrgContext();
  await ensureFresh(ctx.org.id);
  return ok(await getDashboard(ctx.org.id, ctx.org.timezone));
});

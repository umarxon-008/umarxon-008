import { ok, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { checkRateLimit } from '@/server/rate-limit';
import { writeAudit } from '@/server/audit';
import { runInspection } from '@/server/services/inspector';
import { syncOrganizationTelemetry } from '@/server/services/telemetry-sync';

export const POST = route(async () => {
  const ctx = await requireOrgContext('inspector.run');
  checkRateLimit(`inspector:${ctx.org.id}`, 10, 60_000);
  await syncOrganizationTelemetry(ctx.org.id);
  const res = await runInspection(ctx.org.id, new Date(), ctx.user.id);
  await writeAudit({ organizationId: ctx.org.id, actorId: ctx.user.id, action: 'inspector.run_manual', entityType: 'Inspector', metadata: res });
  return ok(res);
});

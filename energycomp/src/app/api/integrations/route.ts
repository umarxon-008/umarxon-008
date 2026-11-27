import { z } from 'zod';
import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { createIngestToken, listIntegrations } from '@/server/services/integrations';
import { SENSOR_PROVIDERS } from '@/server/providers/sensor/registry';
import { aiProviderStatus } from '@/server/providers/ai';
import { serverEnv } from '@/server/env';

export const GET = route(async () => {
  const ctx = await requireOrgContext();
  return ok({
    integrations: await listIntegrations(ctx.org.id),
    providers: SENSOR_PROVIDERS.map(({ id, name, source, mode, implemented, description }) => ({ id, name, source, mode, implemented, description })),
    ai: aiProviderStatus(),
    email: serverEnv.emailConfigured,
    payment: serverEnv.paymentConfigured,
  });
});

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('integration.manage');
  const { name } = await parseJson(req, z.object({ name: z.string().trim().min(2).max(60) }));
  return ok(await createIngestToken(ctx, name), { status: 201 });
});

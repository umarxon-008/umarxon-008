import { ok, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { revokeIntegration } from '@/server/services/integrations';

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext('integration.manage');
  await revokeIntegration(ctx, id);
  return ok({ revoked: true });
});

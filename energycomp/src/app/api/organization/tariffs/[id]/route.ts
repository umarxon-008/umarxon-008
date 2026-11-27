import { ok, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { deleteTariff } from '@/server/services/organization';

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext('tariff.update');
  await deleteTariff(ctx, id);
  return ok({ deleted: true });
});

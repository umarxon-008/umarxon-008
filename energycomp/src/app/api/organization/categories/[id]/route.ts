import { ok, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { deleteCategory } from '@/server/services/organization';

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext('category.write');
  await deleteCategory(ctx, id);
  return ok({ deleted: true });
});

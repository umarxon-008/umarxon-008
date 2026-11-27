import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { memberUpdateSchema } from '@/schemas/organization';
import { removeMember, updateMemberRole } from '@/server/services/members';

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext('users.manage');
  const { role } = await parseJson(req, memberUpdateSchema);
  return ok(await updateMemberRole(ctx, id, role));
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext('users.manage');
  await removeMember(ctx, id);
  return ok({ removed: true });
});

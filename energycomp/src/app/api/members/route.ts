import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { memberCreateSchema } from '@/schemas/organization';
import { addMember, listMembers } from '@/server/services/members';

export const GET = route(async () => {
  const ctx = await requireOrgContext('users.view');
  return ok(await listMembers(ctx.org.id));
});

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('users.manage');
  return ok(await addMember(ctx, await parseJson(req, memberCreateSchema)), { status: 201 });
});

import { ok, parseJson, route } from '@/server/api';
import { profileSchema } from '@/schemas/auth';
import { updateProfile } from '@/server/services/auth';
import { requireUser } from '@/server/auth/context';

export const GET = route(async () => {
  const ctx = await requireUser();
  return ok({ user: ctx.user, organization: ctx.org, role: ctx.role, memberships: ctx.memberships });
});

export const PATCH = route(async (req) => {
  const ctx = await requireUser();
  const { name } = await parseJson(req, profileSchema);
  return ok(await updateProfile(ctx.user.id, name));
});

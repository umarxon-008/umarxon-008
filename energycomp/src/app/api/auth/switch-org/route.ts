import { ok, parseJson, route } from '@/server/api';
import { forbidden } from '@/server/errors';
import { switchOrgSchema } from '@/schemas/organization';
import { requireUser } from '@/server/auth/context';
import { setActiveOrganization } from '@/server/auth/session';

export const POST = route(async (req) => {
  const ctx = await requireUser();
  const { organizationId } = await parseJson(req, switchOrgSchema);
  if (!ctx.memberships.some((m) => m.organizationId === organizationId)) throw forbidden("Siz bu tashkilot a'zosi emassiz");
  await setActiveOrganization(ctx.sessionId, organizationId);
  return ok({ organizationId });
});

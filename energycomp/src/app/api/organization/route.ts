import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { organizationUpdateSchema } from '@/schemas/organization';
import { getOrganizationDetails, updateOrganization } from '@/server/services/organization';

export const GET = route(async () => {
  const ctx = await requireOrgContext();
  return ok(await getOrganizationDetails(ctx.org.id));
});

export const PATCH = route(async (req) => {
  const ctx = await requireOrgContext('org.update');
  return ok(await updateOrganization(ctx, await parseJson(req, organizationUpdateSchema)));
});

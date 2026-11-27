import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { categorySchema } from '@/schemas/organization';
import { addCategory } from '@/server/services/organization';
import { listCategories } from '@/server/services/equipment';

export const GET = route(async () => {
  const ctx = await requireOrgContext();
  return ok(await listCategories(ctx.org.id));
});

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('category.write');
  const { name } = await parseJson(req, categorySchema);
  return ok(await addCategory(ctx, name), { status: 201 });
});

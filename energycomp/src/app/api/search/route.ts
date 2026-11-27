import { z } from 'zod';
import { ok, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { search } from '@/server/services/search';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext();
  const { q } = parseQuery(req, z.object({ q: z.string().max(100).default('') }));
  return ok(await search(ctx.org.id, q));
});

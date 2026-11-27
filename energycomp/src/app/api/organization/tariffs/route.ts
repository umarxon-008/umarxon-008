import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { tariffSchema } from '@/schemas/organization';
import { addTariff } from '@/server/services/organization';

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('tariff.update');
  const t = await addTariff(ctx, await parseJson(req, tariffSchema));
  return ok({ ...t, pricePerKwh: Number(t.pricePerKwh) }, { status: 201 });
});

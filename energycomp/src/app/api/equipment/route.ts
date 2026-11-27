import { ok, parseJson, parseQuery, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { equipmentInputSchema, equipmentListQuerySchema } from '@/schemas/equipment';
import { createEquipment, listEquipment } from '@/server/services/equipment';

export const GET = route(async (req) => {
  const ctx = await requireOrgContext();
  return ok(await listEquipment(ctx, parseQuery(req, equipmentListQuerySchema)));
});

export const POST = route(async (req) => {
  const ctx = await requireOrgContext('equipment.write');
  const data = await parseJson(req, equipmentInputSchema);
  return ok(await createEquipment(ctx, data), { status: 201 });
});

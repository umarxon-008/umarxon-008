import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { equipmentInputSchema } from '@/schemas/equipment';
import { deleteEquipment, getEquipment, updateEquipment } from '@/server/services/equipment';

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext();
  return ok(await getEquipment(ctx, id));
});

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext('equipment.write');
  const data = await parseJson(req, equipmentInputSchema);
  return ok(await updateEquipment(ctx, id, data));
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext('equipment.write');
  await deleteEquipment(ctx, id);
  return ok({ deleted: true });
});

import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { equipmentPositionSchema } from '@/schemas/equipment';
import { setEquipmentPosition } from '@/server/services/equipment';

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext('map.write');
  const pos = await parseJson(req, equipmentPositionSchema);
  return ok(await setEquipmentPosition(ctx, id, pos));
});

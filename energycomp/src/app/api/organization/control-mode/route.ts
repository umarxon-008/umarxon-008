import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { controlModeSchema } from '@/schemas/organization';
import { setControlMode } from '@/server/services/organization';

export const PUT = route(async (req) => {
  const ctx = await requireOrgContext('control.configure');
  const { controlMode } = await parseJson(req, controlModeSchema);
  await setControlMode(ctx, controlMode);
  return ok({ controlMode });
});

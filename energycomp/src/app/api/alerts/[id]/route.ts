import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { alertStatusSchema } from '@/schemas/alerts';
import { getAlert, updateAlertStatus } from '@/server/services/inspector';

export const GET = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext();
  return ok(await getAlert(ctx.org.id, id));
});

export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext('alert.update');
  const { status, note } = await parseJson(req, alertStatusSchema);
  return ok(await updateAlertStatus(ctx, id, status, note));
});

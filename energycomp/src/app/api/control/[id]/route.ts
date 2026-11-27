import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { controlReviewSchema } from '@/schemas/alerts';
import { cancelControl, reviewControl } from '@/server/services/control';

export const POST = route<{ id: string }>(async (req, { id }) => {
  const ctx = await requireOrgContext('control.review');
  const { decision, note } = await parseJson(req, controlReviewSchema);
  return ok(await reviewControl(ctx, id, decision, note));
});

export const DELETE = route<{ id: string }>(async (_req, { id }) => {
  const ctx = await requireOrgContext('control.request');
  await cancelControl(ctx, id);
  return ok({ cancelled: true });
});

import { ok, parseJson, route } from '@/server/api';
import { requireOrgContext } from '@/server/auth/context';
import { notificationPrefsSchema } from '@/schemas/organization';
import { getMyMembership, updateNotificationPrefs } from '@/server/services/members';

export const GET = route(async () => {
  const ctx = await requireOrgContext();
  const m = await getMyMembership(ctx);
  return ok({ notifyCritical: m.notifyCritical, notifyWarning: m.notifyWarning, notifyInfo: m.notifyInfo, notifyControl: m.notifyControl });
});

export const PUT = route(async (req) => {
  const ctx = await requireOrgContext();
  await updateNotificationPrefs(ctx, await parseJson(req, notificationPrefsSchema));
  return ok({ saved: true });
});

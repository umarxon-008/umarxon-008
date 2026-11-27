import { ok, route } from '@/server/api';
import { logoutUser } from '@/server/services/auth';

export const POST = route(async () => {
  await logoutUser();
  return ok({ loggedOut: true });
});

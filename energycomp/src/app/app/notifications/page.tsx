import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { NotificationsView } from '@/features/notifications/notifications-view';

export const metadata: Metadata = { title: 'Bildirishnomalar' };

export default async function NotificationsPage() {
  const ctx = await requirePageContext();
  return <NotificationsView timezone={ctx.org.timezone} />;
}

import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { toZonedDateInput } from '@/lib/time';
import { can } from '@/lib/permissions';
import { AnalyticsView } from '@/features/analytics/analytics-view';

export const metadata: Metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  const ctx = await requirePageContext();
  return <AnalyticsView timezone={ctx.org.timezone} today={toZonedDateInput(new Date(), ctx.org.timezone)} canEditBaseline={can(ctx.role, 'org.update')} />;
}

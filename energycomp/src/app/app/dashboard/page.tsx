import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { getDashboard } from '@/server/services/dashboard';
import { DashboardView } from '@/features/dashboard/dashboard-view';
import { can } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const ctx = await requirePageContext();
  const sp = await searchParams;
  const data = await getDashboard(ctx.org.id, ctx.org.timezone);
  return (
    <DashboardView
      initial={JSON.parse(JSON.stringify(data))}
      timezone={ctx.org.timezone}
      currency={ctx.org.currency}
      userName={ctx.user.name}
      canAddEquipment={can(ctx.role, 'equipment.write')}
      welcome={sp.welcome === '1'}
      denied={sp.denied === '1'}
    />
  );
}

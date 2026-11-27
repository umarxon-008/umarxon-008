import { AppShell } from '@/components/layout/app-shell';
import { requirePageContext } from '@/server/auth/context';
import { prisma } from '@/server/db';
import { ensureFresh } from '@/server/services/telemetry-sync';
import { unreadCount } from '@/server/services/notifications';
import { getOrgPlan } from '@/server/services/plans';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePageContext();
  await ensureFresh(ctx.org.id);
  const [unread, sources, plan] = await Promise.all([
    unreadCount(ctx.user.id, ctx.org.id),
    prisma.equipment.groupBy({ by: ['dataSource'], where: { organizationId: ctx.org.id }, _count: { _all: true } }),
    getOrgPlan(ctx.org.id),
  ]);
  const demo = sources.find((s) => s.dataSource === 'DEMO')?._count._all ?? 0;
  const real = sources.find((s) => s.dataSource === 'REAL')?._count._all ?? 0;
  const dataMode = demo && real ? 'MIXED' : demo ? 'DEMO' : real ? 'REAL' : 'EMPTY';
  return (
    <AppShell
      user={ctx.user}
      org={{ id: ctx.org.id, name: ctx.org.name, isDemo: ctx.org.isDemo }}
      role={ctx.role}
      memberships={ctx.memberships}
      unread={unread}
      dataMode={dataMode}
      planName={plan.name}
    >
      {children}
    </AppShell>
  );
}

import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { getAiQuota, getOrgSubscription, getUsage, listPlans } from '@/server/services/plans';
import { can } from '@/lib/permissions';
import { BillingView } from '@/features/billing/billing-view';

export const metadata: Metadata = { title: 'Tarif va obuna' };

export default async function BillingPage() {
  const ctx = await requirePageContext();
  const [sub, usage, plans, aiQuota] = await Promise.all([getOrgSubscription(ctx.org.id), getUsage(ctx.org.id), listPlans(), getAiQuota(ctx.org.id, ctx.org.timezone)]);
  return (
    <BillingView
      subscription={JSON.parse(JSON.stringify({ status: sub.status, isDemo: sub.isDemo, plan: sub.plan }))}
      usage={usage}
      plans={plans}
      aiQuota={aiQuota}
      canManage={can(ctx.role, 'billing.manage')}
      isPlatformAdmin={ctx.user.isPlatformAdmin}
    />
  );
}

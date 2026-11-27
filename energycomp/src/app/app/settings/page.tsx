import type { Metadata } from 'next';
import { requirePageContext } from '@/server/auth/context';
import { getTariffPoints } from '@/server/services/organization';
import { getOrgPlan } from '@/server/services/plans';
import { serverEnv } from '@/server/env';
import { tariffAt } from '@/lib/energy';
import { can } from '@/lib/permissions';
import { SettingsView } from '@/features/settings/settings-view';

export const metadata: Metadata = { title: 'Sozlamalar' };

export default async function SettingsPage() {
  const ctx = await requirePageContext();
  const [tariffs, plan] = await Promise.all([getTariffPoints(ctx.org.id), getOrgPlan(ctx.org.id)]);
  return (
    <SettingsView
      user={ctx.user}
      role={ctx.role}
      org={ctx.org}
      tariff={tariffAt(tariffs, new Date())?.pricePerKwh ?? null}
      planName={plan.name}
      canManageIntegrations={can(ctx.role, 'integration.manage')}
      hasIntegrations={plan.features.includes('integrations')}
      appUrl={serverEnv.appUrl}
    />
  );
}
